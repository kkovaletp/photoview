import { act, fireEvent, within } from '@testing-library/react'
import {
    afterEach,
    describe,
    expect,
    test,
    vi,
} from 'vitest'
import type * as mapboxgl from 'mapbox-gl/esm'
import type { MediaMarker } from '../../Pages/PlacesPage/MapPresentMarker'
import { registerMediaMarkers } from './mapboxHelperFunctions'

type TestFeature = {
    geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'LineString'; coordinates: [number, number][] }
    | null
    properties: MediaMarker | null
}

function makeFeature(cluster = false): TestFeature {
    return {
        geometry: { type: 'Point', coordinates: [10, 20] },
        properties: {
            id: 1,
            media_id: 'photo-1',
            cluster,
            cluster_id: 'cluster-1',
            point_count_abbreviated: 2,
            thumbnail: JSON.stringify({ url: '/thumbnail.jpg' }),
        },
    }
}

const disposers: Array<() => void> = []
const hosts: HTMLDivElement[] = []

function makeMap(initialFeatures: TestFeature[] = []) {
    let features = initialFeatures
    const listeners = new Map<string, Set<() => void>>()
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)

    const map = {
        getSource: vi.fn(() => ({})),
        querySourceFeatures: vi.fn(() => features),
        on: vi.fn((event: string, listener: () => void) => {
            const handlers = listeners.get(event) ?? new Set()
            handlers.add(listener)
            listeners.set(event, handlers)
        }),
        off: vi.fn((event: string, listener: () => void) => {
            listeners.get(event)?.delete(listener)
        }),
    }

    const instances: Array<{
        setLngLat: ReturnType<typeof vi.fn>
        addTo: ReturnType<typeof vi.fn>
        remove: ReturnType<typeof vi.fn>
    }> = []

    const Marker = vi.fn(function ({
        element,
    }: {
        element: HTMLElement
    }) {
        const marker = {
            setLngLat: vi.fn().mockReturnThis(),
            addTo: vi.fn(() => {
                host.appendChild(element)
                return marker
            }),
            remove: vi.fn(() => element.remove()),
        }
        instances.push(marker)
        return marker
    })

    const dispatch = vi.fn()
    let dispose!: () => void

    act(() => {
        dispose = registerMediaMarkers({
            map: map as unknown as mapboxgl.Map,
            mapboxLibrary: { Marker } as unknown as typeof mapboxgl,
            dispatchMarkerMedia: dispatch,
        })
    })
    disposers.push(dispose)

    const emit = (event: string) => {
        act(() => {
            for (const listener of [...(listeners.get(event) ?? [])]) {
                listener()
            }
        })
    }

    return {
        host,
        map,
        Marker,
        instances,
        dispatch,
        dispose,
        emit,
        setFeatures(next: TestFeature[]) {
            features = next
        },
    }
}

afterEach(async () => {
    await act(() => {
        for (const dispose of disposers.splice(0)) {
            dispose()
        }
    })

    for (const host of hosts.splice(0)) {
        host.remove()
    }

    vi.restoreAllMocks()
})

describe('registerMediaMarkers', () => {
    test.each([false, true])(
        'restores marker content and interaction after it returns; cluster=%s',
        cluster => {
            const feature = makeFeature(cluster)
            const fixture = makeMap([feature])

            expect(within(fixture.host).getAllByRole('img')).toHaveLength(2)

            fixture.setFeatures([])
            fixture.emit('moveend')
            expect(within(fixture.host).queryAllByRole('img')).toHaveLength(0)

            fixture.setFeatures([feature])
            fixture.emit('sourcedata')
            expect(within(fixture.host).getAllByRole('img')).toHaveLength(2)
            expect(fixture.Marker).toHaveBeenCalledTimes(2)

            fireEvent.click(within(fixture.host).getAllByRole('img')[1])

            expect(fixture.dispatch).toHaveBeenCalledWith({
                type: 'replacePresentMarker',
                marker: {
                    cluster,
                    id: cluster ? 'cluster-1' : 'photo-1',
                },
            })
        }
    )

    test('reuses current markers and ignores duplicate tile features', () => {
        const feature = makeFeature()
        const fixture = makeMap([feature, feature])

        fixture.emit('move')
        fixture.emit('moveend')
        fixture.emit('sourcedata')

        expect(fixture.Marker).toHaveBeenCalledOnce()
        expect(fixture.instances[0].addTo).toHaveBeenCalledOnce()
        expect(within(fixture.host).getAllByRole('img')).toHaveLength(2)
    })

    test('updates coordinates without replacing the marker', () => {
        const fixture = makeMap([makeFeature()])

        fixture.setFeatures([
            {
                ...makeFeature(),
                geometry: { type: 'Point', coordinates: [30, 40] },
            },
        ])
        fixture.emit('sourcedata')

        expect(fixture.Marker).toHaveBeenCalledOnce()
        expect(fixture.instances[0].setLngLat).toHaveBeenLastCalledWith([30, 40])
    })

    test('keeps maps with the same feature IDs independent', () => {
        const first = makeMap([makeFeature()])
        const second = makeMap([makeFeature()])

        fireEvent.click(within(second.host).getAllByRole('img')[1])

        expect(second.dispatch).toHaveBeenCalledOnce()
        expect(first.dispatch).not.toHaveBeenCalled()

        first.setFeatures([])
        first.emit('moveend')

        expect(within(first.host).queryAllByRole('img')).toHaveLength(0)
        expect(within(second.host).getAllByRole('img')).toHaveLength(2)
    })

    test('disposes roots and listeners when the map is removed', async () => {
        const fixture = makeMap([makeFeature()])
        const markerElement = fixture.host.firstElementChild!

        fixture.emit('remove')

        await act(async () => { })

        expect(fixture.host).toBeEmptyDOMElement()
        expect(markerElement).toBeEmptyDOMElement()

        for (const event of ['move', 'moveend', 'sourcedata', 'remove']) {
            expect(fixture.map.off).toHaveBeenCalledWith(
                event,
                expect.any(Function)
            )
        }

        fixture.emit('move')
        fixture.dispose()

        expect(fixture.Marker).toHaveBeenCalledOnce()
        expect(fixture.instances[0].remove).toHaveBeenCalledOnce()
    })

    test.each([
        {
            name: 'missing geometry',
            feature: { ...makeFeature(), geometry: null },
            warning: 'WARN: geojson feature had no geometry',
        },
        {
            name: 'non-Point geometry',
            feature: {
                ...makeFeature(),
                geometry: {
                    type: 'LineString' as const,
                    coordinates: [[0, 0], [1, 1]] as [number, number][],
                },
            },
            warning: 'WARN: geojson feature geometry is not a Point',
        },
        {
            name: 'missing properties',
            feature: { ...makeFeature(), properties: null },
            warning: 'WARN: geojson feature had no properties',
        },
    ])('skips $name', ({ feature, warning }) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })
        const fixture = makeMap([feature])

        expect(fixture.Marker).not.toHaveBeenCalled()
        expect(warn).toHaveBeenCalledWith(
            warning,
            expect.objectContaining({ feature })
        )
    })

    test('does not query an unavailable source', () => {
        const fixture = makeMap()
        fixture.map.querySourceFeatures.mockClear()
        fixture.map.getSource.mockReturnValue(undefined as never)

        fixture.emit('sourcedata')

        expect(fixture.map.querySourceFeatures).not.toHaveBeenCalled()
    })
})
