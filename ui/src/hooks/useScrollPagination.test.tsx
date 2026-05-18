import { vi, describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ApolloQueryResult } from '@apollo/client'
import useScrollPagination from './useScrollPagination'

// ─── IntersectionObserver mock ────────────────────────────────────────────────

let originalIntersectionObserver: typeof globalThis.IntersectionObserver | undefined
let capturedCallback: IntersectionObserverCallback | null = null
let mockObserve: ReturnType<typeof vi.fn>
let mockUnobserve: ReturnType<typeof vi.fn>
let mockDisconnect: ReturnType<typeof vi.fn>

beforeAll(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver
})

afterAll(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver as typeof IntersectionObserver
})

beforeEach(() => {
    capturedCallback = null
    mockObserve = vi.fn()
    mockUnobserve = vi.fn()
    mockDisconnect = vi.fn()

    globalThis.IntersectionObserver = vi.fn(
        (callback: IntersectionObserverCallback) => {
            capturedCallback = callback
            return {
                observe: mockObserve,
                unobserve: mockUnobserve,
                disconnect: mockDisconnect,
                takeRecords: vi.fn(),
                root: null,
                rootMargin: '',
                thresholds: [],
            }
        },
    ) as unknown as typeof IntersectionObserver
})

afterEach(() => {
    vi.clearAllMocks()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SimpleData = { items: string[] }
const getItems = (data: SimpleData) => data.items

const makeResult = (items: string[]): ApolloQueryResult<SimpleData> => ({
    data: { items },
    loading: false,
    networkStatus: 7,
})

/**
 * Fire the IntersectionObserver callback with the supplied entries.
 * Callers wrap it in act and wait for async state updates when needed.
 */
const triggerIntersection = (entries: { isIntersecting: boolean }[]) => {
    capturedCallback?.(
        entries as unknown as IntersectionObserverEntry[],
        {} as IntersectionObserver,
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useScrollPagination', () => {
    // ── return value ────────────────────────────────────────────────────────────

    describe('initial return value', () => {
        test('returns finished=false and containerElem as a function', () => {
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: [] },
                    fetchMore: vi.fn(),
                    getItems,
                }),
            )

            expect(result.current.finished).toBe(false)
            expect(typeof result.current.containerElem).toBe('function')
        })
    })

    // ── observer lifecycle ───────────────────────────────────────────────────────

    describe('observer lifecycle via containerElem', () => {
        test('creates IntersectionObserver and observes the element when not loading', () => {
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: [] },
                    fetchMore: vi.fn(),
                    getItems,
                }),
            )
            const elem = document.createElement('div')

            act(() => {
                result.current.containerElem(elem)
            })

            expect(globalThis.IntersectionObserver).toHaveBeenCalled()
            expect(mockObserve).toHaveBeenCalledWith(elem)
        })

        test('creates IntersectionObserver but does NOT observe the element when loading is true', () => {
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: true,
                    data: { items: [] },
                    fetchMore: vi.fn(),
                    getItems,
                }),
            )
            const elem = document.createElement('div')

            act(() => {
                result.current.containerElem(elem)
            })

            expect(mockObserve).not.toHaveBeenCalled()
        })

        test('disconnects the observer when containerElem is called with null', () => {
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: [] },
                    fetchMore: vi.fn(),
                    getItems,
                }),
            )
            const elem = document.createElement('div')
            act(() => {
                result.current.containerElem(elem)
            })

            act(() => {
                result.current.containerElem(null)
            })

            expect(mockDisconnect).toHaveBeenCalled()
        })

        test('disconnects the previous observer when reassigned to a new element', () => {
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: [] },
                    fetchMore: vi.fn(),
                    getItems,
                }),
            )
            const elem1 = document.createElement('div')
            const elem2 = document.createElement('div')

            act(() => {
                result.current.containerElem(elem1)
            })
            const disconnectCountAfterFirstAssign = mockDisconnect.mock.calls.length

            act(() => {
                result.current.containerElem(elem2)
            })

            expect(mockDisconnect.mock.calls.length).toBeGreaterThan(disconnectCountAfterFirstAssign)
            expect(mockObserve).toHaveBeenCalledWith(elem2)
        })
    })

    // ── intersection callback behaviour ─────────────────────────────────────────

    describe('IntersectionObserver callback – fetchMore triggering', () => {
        test('calls fetchMore with offset equal to data item count when an entry is intersecting', async () => {
            const fetchMore = vi.fn().mockResolvedValue(makeResult(['d']))
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: ['a', 'b', 'c'] },
                    fetchMore,
                    getItems,
                }),
            )
            act(() => {
                result.current.containerElem(document.createElement('div'))
            })

            await act(async () => {
                triggerIntersection([{ isIntersecting: true }])
            })

            expect(fetchMore).toHaveBeenCalledWith({ variables: { offset: 3 } })
        })

        test('uses offset 0 when data is undefined', async () => {
            const fetchMore = vi.fn().mockResolvedValue(makeResult([]))
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: undefined,
                    fetchMore,
                    getItems,
                }),
            )
            act(() => {
                result.current.containerElem(document.createElement('div'))
            })

            await act(async () => {
                triggerIntersection([{ isIntersecting: true }])
            })

            expect(fetchMore).toHaveBeenCalledWith({ variables: { offset: 0 } })
        })

        test('does NOT call fetchMore when no entry is intersecting', () => {
            const fetchMore = vi.fn()
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: [] },
                    fetchMore,
                    getItems,
                }),
            )
            act(() => {
                result.current.containerElem(document.createElement('div'))
            })

            act(() => {
                triggerIntersection([{ isIntersecting: false }])
            })

            expect(fetchMore).not.toHaveBeenCalled()
        })

        test('calls fetchMore when at least one of multiple entries is intersecting', async () => {
            const fetchMore = vi.fn().mockResolvedValue(makeResult(['b']))
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: ['a'] },
                    fetchMore,
                    getItems,
                }),
            )
            act(() => {
                result.current.containerElem(document.createElement('div'))
            })

            await act(async () => {
                triggerIntersection([{ isIntersecting: false }, { isIntersecting: true }])
            })

            expect(fetchMore).toHaveBeenCalledOnce()
        })

        test('does NOT call fetchMore when all entries are not intersecting (multiple entries)', () => {
            const fetchMore = vi.fn()
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: ['a'] },
                    fetchMore,
                    getItems,
                }),
            )
            act(() => {
                result.current.containerElem(document.createElement('div'))
            })

            act(() => {
                triggerIntersection([{ isIntersecting: false }, { isIntersecting: false }])
            })

            expect(fetchMore).not.toHaveBeenCalled()
        })
    })

    // ── finished flag ────────────────────────────────────────────────────────────

    describe('finished flag', () => {
        test('keeps finished=false when fetchMore resolves with one or more new items', async () => {
            const fetchMore = vi.fn().mockResolvedValue(makeResult(['b']))
            const { result } = renderHook(() =>
                useScrollPagination({
                    loading: false,
                    data: { items: ['a'] },
                    fetchMore,
                    getItems,
                }),
            )
            act(() => {
                result.current.containerElem(document.createElement('div'))
            })

            await act(async () => {
                triggerIntersection([{ isIntersecting: true }])
            })

            await waitFor(() => expect(fetchMore).toHaveBeenCalled())
            expect(result.current.finished).toBe(false)
        })
    })

    // ── loading state transitions ────────────────────────────────────────────────

    describe('loading state transitions', () => {
        test('unobserves the element when loading changes from false to true', () => {
            const elem = document.createElement('div')
            const { result, rerender } = renderHook(
                (props: { loading: boolean }) =>
                    useScrollPagination({
                        loading: props.loading,
                        data: { items: [] },
                        fetchMore: vi.fn(),
                        getItems,
                    }),
                { initialProps: { loading: false } },
            )
            act(() => {
                result.current.containerElem(elem)
            })
            mockUnobserve.mockClear()

            rerender({ loading: true })

            expect(mockUnobserve).toHaveBeenCalledWith(elem)
        })

        test('re-observes the element when loading changes from true to false', () => {
            const elem = document.createElement('div')
            const { result, rerender } = renderHook(
                (props: { loading: boolean }) =>
                    useScrollPagination({
                        loading: props.loading,
                        data: { items: [] },
                        fetchMore: vi.fn(),
                        getItems,
                    }),
                { initialProps: { loading: true } },
            )
            act(() => {
                result.current.containerElem(elem)
            })
            mockObserve.mockClear()

            rerender({ loading: false })

            expect(mockObserve).toHaveBeenCalledWith(elem)
        })
    })

    // ── data changes ─────────────────────────────────────────────────────────────

    describe('data reference changes', () => {
        test('resets finished to false when data changes to a new reference', async () => {
            const fetchMore = vi.fn().mockResolvedValue(makeResult([]))
            const { result, rerender } = renderHook(
                (props: { data: SimpleData }) =>
                    useScrollPagination({
                        loading: false,
                        data: props.data,
                        fetchMore,
                        getItems,
                    }),
                { initialProps: { data: { items: ['a'] } } },
            )
            act(() => {
                result.current.containerElem(document.createElement('div'))
            })

            await act(async () => {
                triggerIntersection([{ isIntersecting: true }])
            })
            await waitFor(() => expect(result.current.finished).toBe(true))

            rerender({ data: { items: ['a', 'b'] } })

            expect(result.current.finished).toBe(false)
        })
    })
})
