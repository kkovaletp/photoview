import { render, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ApolloError } from '@apollo/client'
import { SubscriptionsHook, Message } from './SubscriptionsHook'
import { NotificationType } from '../../__generated__/globalTypes'

// ── Apollo mock ──────────────────────────────────────────────────────────────

const { mockUseSubscription } = vi.hoisted(() => ({
    mockUseSubscription: vi.fn(),
}))

vi.mock('@apollo/client', async importOriginal => {
    const actual = await importOriginal<typeof import('@apollo/client')>() as object
    return {
        ...actual,
        useSubscription: mockUseSubscription,
    }
})

// ── Test helpers ─────────────────────────────────────────────────────────────

// Counter ensures each test uses a unique notification key, preventing
// cross-test contamination of the module-level messageTimeoutHandles Map.
let keyCounter = 0
const uniqueKey = () => `test-key-${++keyCounter}`

/** Build a minimal notification fixture with safe defaults. */
const makeNotification = (key: string, overrides: Record<string, unknown> = {}) => ({
    __typename: 'Notification' as const,
    key,
    type: NotificationType.Message,
    header: 'Test Header',
    content: 'Test Content',
    progress: null,
    positive: false,
    negative: false,
    timeout: null,
    ...overrides,
})

/**
 * Apply the functional updater that was passed to setMessages at the given
 * call index against the provided previous state.
 */
const applyUpdater = (
    mockFn: ReturnType<typeof vi.fn>,
    callIndex: number,
    prev: Message[]
): Message[] => {
    const updater = mockFn.mock.calls[callIndex][0]
    return typeof updater === 'function' ? updater(prev) : updater
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SubscriptionsHook', () => {
    let setMessages: ReturnType<typeof vi.fn>

    beforeEach(() => {
        setMessages = vi.fn()
        // Default: subscription is idle (no data, no error)
        mockUseSubscription.mockReturnValue({ data: undefined, error: undefined, loading: false })
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    // ── Rendering ──────────────────────────────────────────────────────────────

    it('renders null — produces no DOM output', () => {
        const { container } = render(<SubscriptionsHook setMessages={setMessages} />)
        expect(container.firstChild).toBeNull()
    })

    it('does not call setMessages when there is no data and no error', () => {
        render(<SubscriptionsHook setMessages={setMessages} />)
        expect(setMessages).not.toHaveBeenCalled()
    })

    // ── Error handling ─────────────────────────────────────────────────────────

    describe('when the subscription reports an error', () => {
        it('calls setMessages exactly once with a negative "Network error" message', () => {
            const error = new ApolloError({ errorMessage: 'WebSocket disconnected' })
            mockUseSubscription.mockReturnValue({ data: undefined, error, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            expect(setMessages).toHaveBeenCalledTimes(1)
            const result = applyUpdater(setMessages, 0, [])
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                type: NotificationType.Message,
                props: {
                    header: 'Network error',
                    content: 'WebSocket disconnected',
                    negative: true,
                },
            })
        })

        it('generates a unique key starting with "download-"', () => {
            const error = new ApolloError({ errorMessage: 'Oops' })
            mockUseSubscription.mockReturnValue({ data: undefined, error, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const result = applyUpdater(setMessages, 0, [])
            expect(result[0].key).toMatch(/^download-\d+-[a-z0-9]+$/)
        })

        it('appends the error message to any existing messages', () => {
            const existing: Message = {
                key: uniqueKey(),
                type: NotificationType.Message,
                props: { header: 'Existing', content: 'Already there' },
            }
            const error = new ApolloError({ errorMessage: 'New error' })
            mockUseSubscription.mockReturnValue({ data: undefined, error, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const result = applyUpdater(setMessages, 0, [existing])
            expect(result).toHaveLength(2)
            expect(result[0].key).toBe(existing.key)
            expect(result[1].props.negative).toBe(true)
        })

        it('processes data as well when both error and data arrive together', () => {
            const error = new ApolloError({ errorMessage: 'Partial failure' })
            const notification = makeNotification(uniqueKey())
            mockUseSubscription.mockReturnValue({ data: { notification }, error, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            // Effect processes error first, then the notification (two setMessages calls minimum)
            expect(setMessages.mock.calls.length).toBeGreaterThanOrEqual(2)
        })
    })

    // ── Message upsert ─────────────────────────────────────────────────────────

    describe('when a new notification arrives', () => {
        it('appends a new message when the key is not yet in state', () => {
            const key = uniqueKey()
            const notification = makeNotification(key)
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [])
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                key,
                type: NotificationType.Message,
                props: { header: 'Test Header', content: 'Test Content' },
            })
        })

        it('replaces an existing message when the key already exists in state', () => {
            const key = uniqueKey()
            const existing: Message = {
                key,
                type: NotificationType.Message,
                props: { header: 'Old Header', content: 'Old Content' },
            }
            const notification = makeNotification(key, {
                header: 'Updated Header',
                content: 'Updated Content',
            })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [existing])
            expect(result).toHaveLength(1)
            expect(result[0].props.header).toBe('Updated Header')
            expect(result[0].props.content).toBe('Updated Content')
        })

        it('maps all notification fields to Message props correctly', () => {
            const key = uniqueKey()
            const notification = makeNotification(key, {
                type: NotificationType.Progress,
                positive: true,
                negative: false,
                progress: 60,
                timeout: 8000,
            })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [])
            expect(result[0]).toMatchObject({
                key,
                type: NotificationType.Progress,
                timeout: 8000,
                props: {
                    header: 'Test Header',
                    content: 'Test Content',
                    positive: true,
                    negative: false,
                    percent: 60,
                },
            })
        })

        it('sets percent to undefined when progress is null', () => {
            const key = uniqueKey()
            const notification = makeNotification(key, { progress: null })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [])
            expect(result[0].props.percent).toBeUndefined()
        })

        it('sets timeout to undefined when notification timeout is null', () => {
            const key = uniqueKey()
            const notification = makeNotification(key, { timeout: null })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [])
            expect(result[0].timeout).toBeUndefined()
        })

        it('processes a second notification and upserts independently when data changes', () => {
            const key1 = uniqueKey()
            const key2 = uniqueKey()

            const notification1 = makeNotification(key1)
            mockUseSubscription.mockReturnValue({
                data: { notification: notification1 },
                error: undefined,
                loading: false,
            })
            const { rerender } = render(<SubscriptionsHook setMessages={setMessages} />)

            const callCountAfterFirst = setMessages.mock.calls.length

            const notification2 = makeNotification(key2, { header: 'Second' })
            mockUseSubscription.mockReturnValue({
                data: { notification: notification2 },
                error: undefined,
                loading: false,
            })
            rerender(<SubscriptionsHook setMessages={setMessages} />)

            expect(setMessages.mock.calls.length).toBeGreaterThan(callCountAfterFirst)
            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [])
            expect(result[0].key).toBe(key2)
            expect(result[0].props.header).toBe('Second')
        })
    })

    // ── Close message ──────────────────────────────────────────────────────────

    describe('when the notification type is Close', () => {
        it('removes the message with the matching key from state', () => {
            const key = uniqueKey()
            const existing: Message = {
                key,
                type: NotificationType.Message,
                props: { header: 'H', content: 'C' },
            }
            const notification = makeNotification(key, { type: NotificationType.Close })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [existing])
            expect(result).toHaveLength(0)
        })

        it('leaves other messages intact when closing by key', () => {
            const keyToClose = uniqueKey()
            const keyToKeep = uniqueKey()
            const toClose: Message = {
                key: keyToClose,
                type: NotificationType.Message,
                props: { header: 'H1', content: 'C1' },
            }
            const toKeep: Message = {
                key: keyToKeep,
                type: NotificationType.Message,
                props: { header: 'H2', content: 'C2' },
            }
            const notification = makeNotification(keyToClose, { type: NotificationType.Close })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [toClose, toKeep])
            expect(result).toHaveLength(1)
            expect(result[0].key).toBe(keyToKeep)
        })

        it('is a no-op when no message in state matches the key', () => {
            const key = uniqueKey()
            const other: Message = {
                key: uniqueKey(),
                type: NotificationType.Message,
                props: { header: 'H', content: 'C' },
            }
            const notification = makeNotification(key, { type: NotificationType.Close })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const last = setMessages.mock.calls.length - 1
            const result = applyUpdater(setMessages, last, [other])
            expect(result).toHaveLength(1)
        })
    })

    // ── Timeout / auto-dismiss ─────────────────────────────────────────────────

    describe('timeout-based auto-dismiss', () => {
        it('schedules removal of the message after the specified timeout', () => {
            const key = uniqueKey()
            const notification = makeNotification(key, { timeout: 3000 })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const callCountAfterRender = setMessages.mock.calls.length

            act(() => {
                vi.advanceTimersByTime(3000)
            })

            expect(setMessages.mock.calls.length).toBeGreaterThan(callCountAfterRender)

            // The dismiss updater filters out only the timed-out message
            const dismissUpdater = setMessages.mock.calls.at(-1)?.[0]
            const msgs: Message[] = [
                { key, type: NotificationType.Message, props: { header: 'H', content: 'C' } },
                { key: uniqueKey(), type: NotificationType.Message, props: { header: 'Other', content: 'O' } },
            ]
            const result = typeof dismissUpdater === 'function' ? dismissUpdater(msgs) : dismissUpdater
            expect(result).toHaveLength(1)
            expect(result[0].key).not.toBe(key)
        })

        it('does not auto-dismiss before the full timeout elapses', () => {
            const key = uniqueKey()
            const notification = makeNotification(key, { timeout: 5000 })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const callCountAfterRender = setMessages.mock.calls.length

            act(() => {
                vi.advanceTimersByTime(4999)
            })

            expect(setMessages.mock.calls.length).toBe(callCountAfterRender)
        })

        it('does not schedule auto-dismiss when timeout is null', () => {
            const key = uniqueKey()
            const notification = makeNotification(key, { timeout: null })
            mockUseSubscription.mockReturnValue({ data: { notification }, error: undefined, loading: false })

            render(<SubscriptionsHook setMessages={setMessages} />)

            const callCountAfterRender = setMessages.mock.calls.length

            act(() => {
                vi.advanceTimersByTime(60_000)
            })

            expect(setMessages.mock.calls.length).toBe(callCountAfterRender)
        })

        it('clears the previous timer handle when the same key receives a new timeout', () => {
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
            const key = uniqueKey()

            const notification1 = makeNotification(key, { timeout: 3000 })
            mockUseSubscription.mockReturnValue({
                data: { notification: notification1 },
                error: undefined,
                loading: false,
            })
            const { rerender } = render(<SubscriptionsHook setMessages={setMessages} />)

            // Deliver a second message with the same key and a new timeout
            const notification2 = makeNotification(key, { timeout: 10_000, content: 'Updated' })
            mockUseSubscription.mockReturnValue({
                data: { notification: notification2 },
                error: undefined,
                loading: false,
            })
            rerender(<SubscriptionsHook setMessages={setMessages} />)

            expect(clearTimeoutSpy).toHaveBeenCalled()
            clearTimeoutSpy.mockRestore()
        })

        it('only fires the latest timer after replacing the handle for the same key', () => {
            const key = uniqueKey()

            const notification1 = makeNotification(key, { timeout: 1000 })
            mockUseSubscription.mockReturnValue({
                data: { notification: notification1 },
                error: undefined,
                loading: false,
            })
            const { rerender } = render(<SubscriptionsHook setMessages={setMessages} />)

            const notification2 = makeNotification(key, { timeout: 5000 })
            mockUseSubscription.mockReturnValue({
                data: { notification: notification2 },
                error: undefined,
                loading: false,
            })
            rerender(<SubscriptionsHook setMessages={setMessages} />)

            const callCountAfterRerender = setMessages.mock.calls.length

            // Advance past the original 1 000 ms — the old timer was replaced, so no dismiss yet
            act(() => {
                vi.advanceTimersByTime(1500)
            })
            expect(setMessages.mock.calls.length).toBe(callCountAfterRerender)

            // Advance to the new 5 000 ms boundary — now the dismiss fires
            act(() => {
                vi.advanceTimersByTime(3500)
            })
            expect(setMessages.mock.calls.length).toBeGreaterThan(callCountAfterRerender)
        })
    })
})
