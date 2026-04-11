// ─── Hoisted mock state (must precede vi.mock calls) ──────────────────────────
import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockApollo = vi.hoisted(() => ({
    loadMedia: vi.fn(),
    data: undefined as
        | { mediaList: Array<{ __typename?: 'Media'; id: string; type: string; blurhash: string | null; favorite: boolean; thumbnail: { __typename?: 'MediaURL'; url: string; width: number; height: number } | null; highRes: { __typename?: 'MediaURL'; url: string } | null; videoWeb: { __typename?: 'MediaURL'; url: string } | null }> }
        | undefined,
}))

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@apollo/client', async () => {
    const actual = await vi.importActual('@apollo/client')
    return {
        ...actual,
        useLazyQuery: vi.fn(() => [mockApollo.loadMedia, { data: mockApollo.data }]),
    }
})

vi.mock('../../components/photoGallery/presentView/PresentView', () => ({
    default: ({ activeMedia }: { activeMedia?: { id: string } }) => (
        <div data-testid="present-view">
            {activeMedia?.id !== undefined && (
                <span data-testid="active-media-id">{activeMedia.id}</span>
            )}
        </div>
    ),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { render, screen, waitFor } from '@testing-library/react'
import MapPresentMarker from './MapPresentMarker'
import type { PlacesState } from './placesReducer'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMediaItem(id: string) {
    return {
        __typename: 'Media' as const,
        id,
        type: 'Photo' as const,
        blurhash: null,
        favorite: false,
        thumbnail: {
            __typename: 'MediaURL' as const,
            url: `/thumbnail/${id}.jpg`,
            width: 200,
            height: 200,
        },
        highRes: { __typename: 'MediaURL' as const, url: `/highres/${id}.jpg` },
        videoWeb: null,
    }
}

function makeDefaultState(overrides: Partial<PlacesState> = {}): PlacesState {
    return {
        presenting: false,
        activeIndex: -1,
        media: [],
        ...overrides,
    }
}

/** Creates a minimal mock mapboxgl.Map for cluster-marker tests. */
function makeClusterMap(options: {
    clusterFeatures?: Array<{ properties: { media_id: string } }>
    error?: Error
}) {
    const { clusterFeatures = [], error } = options
    const getClusterLeaves = vi.fn(
        (
            _clusterId: number,
            _limit: number,
            _offset: number,
            cb: (err: Error | null, features: typeof clusterFeatures | null) => void
        ) => {
            if (error) {
                cb(error, null)
            } else {
                cb(null, clusterFeatures)
            }
        }
    )
    return {
        map: {
            getSource: vi.fn(() => ({ getClusterLeaves })),
            querySourceFeatures: vi.fn(() => []),
        },
        getClusterLeaves,
    }
}

/** Creates a minimal mock mapboxgl.Map for single-marker tests. */
function makeSingleMap(
    features: Array<{ properties: { media_id: string } | null }>
) {
    return {
        getSource: vi.fn(() => ({ getClusterLeaves: vi.fn() })),
        querySourceFeatures: vi.fn(() => features),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MapPresentMarker', () => {
    let dispatchMarkerMedia: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        mockApollo.data = undefined
        dispatchMarkerMedia = vi.fn()
    })

    function renderComponent(state: PlacesState, map: unknown = null) {
        return render(
            <MapPresentMarker
                map={map as any}
                markerMediaState={state}
                dispatchMarkerMedia={dispatchMarkerMedia}
            />
        )
    }

    // ── Rendering ──────────────────────────────────────────────────────────────

    describe('rendering', () => {
        test('renders nothing when presenting is false', () => {
            renderComponent(makeDefaultState())
            expect(screen.queryByTestId('present-view')).toBeNull()
        })

        test('renders PresentView when presenting is true', () => {
            const state = makeDefaultState({
                presenting: true,
                activeIndex: 0,
                media: [makeMediaItem('media-1')] as any,
            })
            renderComponent(state)
            expect(screen.getByTestId('present-view')).toBeInTheDocument()
        })

        test('passes the correct active media to PresentView based on activeIndex', () => {
            const state = makeDefaultState({
                presenting: true,
                activeIndex: 1,
                media: [makeMediaItem('media-1'), makeMediaItem('media-2')] as any,
            })
            renderComponent(state)
            expect(screen.getByTestId('active-media-id')).toHaveTextContent('media-2')
        })
    })

    // ── First useEffect: presentMarker / map guard ─────────────────────────────

    describe('first useEffect - presentMarker and map guard', () => {
        test('dispatches closePresentMode when presentMarker is undefined', async () => {
            renderComponent(makeDefaultState({ presentMarker: undefined }), {})
            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
        })

        test('dispatches closePresentMode when presentMarker is undefined', async () => {
            renderComponent(makeDefaultState({ presentMarker: undefined }), {})
            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
        })

        test('dispatches closePresentMode when presentMarker is null', async () => {
            renderComponent(makeDefaultState({
                presentMarker: null as unknown as PlacesState['presentMarker']
            }), {})
            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
        })

        test('dispatches closePresentMode when map is null', async () => {
            renderComponent(
                makeDefaultState({ presentMarker: { id: 1, cluster: false } }),
                null
            )
            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
        })

        test('does not call loadMedia when presentMarker or map is missing', async () => {
            renderComponent(makeDefaultState(), null)
            // Allow effects to settle
            await waitFor(() => expect(dispatchMarkerMedia).toHaveBeenCalled())
            expect(mockApollo.loadMedia).not.toHaveBeenCalled()
        })
    })

    // ── First useEffect: cluster marker path ───────────────────────────────────

    describe('first useEffect - cluster marker', () => {
        test('calls getClusterLeaves with correct arguments and loadMedia with collected mediaIDs', async () => {
            const clusterFeatures = [
                { properties: { media_id: 'media-1' } },
                { properties: { media_id: 'media-2' } },
            ]
            const { map, getClusterLeaves } = makeClusterMap({ clusterFeatures })
            const state = makeDefaultState({ presentMarker: { id: 42, cluster: true } })

            renderComponent(state, map)

            await waitFor(() => {
                expect(map.getSource).toHaveBeenCalledWith('media')
                expect(getClusterLeaves).toHaveBeenCalledWith(
                    42,
                    1000,
                    0,
                    expect.any(Function)
                )
                expect(mockApollo.loadMedia).toHaveBeenCalledWith({
                    variables: { mediaIDs: ['media-1', 'media-2'] },
                })
            })
        })

        test('loads media for a cluster marker using the numeric cluster ID', async () => {
            const clusterFeatures = [{ properties: { media_id: 'media-x' } }]
            const { map, getClusterLeaves } = makeClusterMap({ clusterFeatures })
            const state = makeDefaultState({ presentMarker: { id: 7, cluster: true } })

            renderComponent(state, map)

            await waitFor(() => {
                expect(getClusterLeaves).toHaveBeenCalledWith(7, 1000, 0, expect.any(Function))
                expect(mockApollo.loadMedia).toHaveBeenCalledWith({
                    variables: { mediaIDs: ['media-x'] },
                })
            })
        })

        test('dispatches closePresentMode when getClusterLeaves returns an error', async () => {
            const { map } = makeClusterMap({ error: new Error('cluster fetch failed') })
            const state = makeDefaultState({ presentMarker: { id: 5, cluster: true } })

            renderComponent(state, map)

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
            expect(mockApollo.loadMedia).not.toHaveBeenCalled()
        })
    })

    // ── First useEffect: single (non-cluster) marker path ─────────────────────

    describe('first useEffect - single (non-cluster) marker', () => {
        test('calls querySourceFeatures and loadMedia with the matching feature mediaID', async () => {
            const map = makeSingleMap([
                { properties: { media_id: 'media-99' } },
                { properties: { media_id: 'other-media' } },
            ])
            const state = makeDefaultState({
                presentMarker: { id: 'media-99', cluster: false },
            })

            renderComponent(state, map)

            await waitFor(() => {
                expect(map.querySourceFeatures).toHaveBeenCalledWith('media')
                expect(mockApollo.loadMedia).toHaveBeenCalledWith({
                    variables: { mediaIDs: ['media-99'] },
                })
            })
        })

        test('dispatches closePresentMode when the matching feature is not found', async () => {
            const map = makeSingleMap([
                { properties: { media_id: 'unrelated-id' } },
            ])
            const state = makeDefaultState({
                presentMarker: { id: 'missing-id', cluster: false },
            })

            renderComponent(state, map)

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
            expect(mockApollo.loadMedia).not.toHaveBeenCalled()
        })

        test('dispatches closePresentMode when feature properties are null', async () => {
            const map = makeSingleMap([{ properties: null }])
            const state = makeDefaultState({
                presentMarker: { id: 'some-id', cluster: false },
            })

            renderComponent(state, map)

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
        })

        test('dispatches closePresentMode when features list is empty', async () => {
            const map = makeSingleMap([])
            const state = makeDefaultState({
                presentMarker: { id: 'some-id', cluster: false },
            })

            renderComponent(state, map)

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'closePresentMode',
                })
            })
        })
    })

    // ── Second useEffect: media data handling ─────────────────────────────────

    describe('second useEffect - media data dispatch', () => {
        test('dispatches replaceMedia with an empty array when loadedMedia is undefined', async () => {
            mockApollo.data = undefined
            renderComponent(makeDefaultState())

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'replaceMedia',
                    media: [],
                })
            })
        })

        test('dispatches replaceMedia with items and openPresentMode when media list is non-empty', async () => {
            const mediaItems = [makeMediaItem('m1'), makeMediaItem('m2')]
            mockApollo.data = { mediaList: mediaItems as any }

            renderComponent(makeDefaultState())

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'replaceMedia',
                    media: mediaItems,
                })
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'openPresentMode',
                    activeIndex: 0,
                })
            })
        })

        test('dispatches replaceMedia but NOT openPresentMode when media list is empty', async () => {
            mockApollo.data = { mediaList: [] }

            renderComponent(makeDefaultState())

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'replaceMedia',
                    media: [],
                })
            })

            const dispatchedTypes = (dispatchMarkerMedia.mock.calls as Array<[{ type: string }]>).map(
                ([action]) => action.type
            )
            expect(dispatchedTypes).not.toContain('openPresentMode')
        })

        test('uses ?? (nullish coalescing) — dispatches replaceMedia([]) when mediaList is null', async () => {
            mockApollo.data = { mediaList: null as any }

            renderComponent(makeDefaultState())

            await waitFor(() => {
                expect(dispatchMarkerMedia).toHaveBeenCalledWith({
                    type: 'replaceMedia',
                    media: [],
                })
            })

            const dispatchedTypes = (dispatchMarkerMedia.mock.calls as Array<[{ type: string }]>).map(
                ([action]) => action.type
            )
            expect(dispatchedTypes).not.toContain('openPresentMode')
        })
    })

    // ── Prop updates (re-render) ───────────────────────────────────────────────

    describe('prop updates', () => {
        test('re-runs first effect when presentMarker changes to undefined, dispatching closePresentMode again', async () => {
            const map = makeSingleMap([{ properties: { media_id: 'media-1' } }])
            const initialState = makeDefaultState({
                presentMarker: { id: 'media-1', cluster: false },
            })

            const { rerender } = renderComponent(initialState, map)

            await waitFor(() => {
                expect(mockApollo.loadMedia).toHaveBeenCalledTimes(1)
            })

            const updatedState = makeDefaultState({ presentMarker: undefined })
            rerender(
                <MapPresentMarker
                    map={map as any}
                    markerMediaState={updatedState}
                    dispatchMarkerMedia={dispatchMarkerMedia}
                />
            )

            await waitFor(() => {
                const calls = (dispatchMarkerMedia.mock.calls as Array<[{ type: string }]>).map(
                    ([a]) => a.type
                )
                expect(calls).toContain('closePresentMode')
            })
        })

        test('re-runs first effect when presentMarker changes to null, dispatching closePresentMode again', async () => {
            const map = makeSingleMap([{ properties: { media_id: 'media-1' } }])
            const initialState = makeDefaultState({
                presentMarker: { id: 'media-1', cluster: false },
            })

            const { rerender } = renderComponent(initialState, map)

            await waitFor(() => {
                expect(mockApollo.loadMedia).toHaveBeenCalledTimes(1)
            })

            const updatedState = makeDefaultState({
                presentMarker: null as unknown as PlacesState['presentMarker']
            })
            rerender(
                <MapPresentMarker
                    map={map as any}
                    markerMediaState={updatedState}
                    dispatchMarkerMedia={dispatchMarkerMedia}
                />
            )

            await waitFor(() => {
                const calls = (dispatchMarkerMedia.mock.calls as Array<[{ type: string }]>).map(
                    ([a]) => a.type
                )
                expect(calls).toContain('closePresentMode')
            })
        })
    })
})
