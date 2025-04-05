import React from 'react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { registerMediaMarkers } from './mapboxHelperFunctions'
import MapClusterMarker from '../../Pages/PlacesPage/MapClusterMarker'
import type { MediaMarker } from '../../Pages/PlacesPage/MapPresentMarker'
import type { PlacesAction } from '../../Pages/PlacesPage/placesReducer'

// Mock dependencies
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}))

vi.mock('../../Pages/PlacesPage/MapClusterMarker', () => ({
    default: vi.fn(() => <div data-testid="mock-cluster-marker" />),
}))

// Mock mapboxgl
const mockMarker = {
    setLngLat: vi.fn(function () { return this }),
    addTo: vi.fn(),
    remove: vi.fn(),
    getElement: vi.fn(),
}

const mockMapboxgl = {
    Marker: vi.fn(() => mockMarker),
}

// Mock map
const createMockMap = () => {
    const mockFeatures: any[] = []

    const mockMap = {
        on: vi.fn(),
        querySourceFeatures: vi.fn(() => mockFeatures),
        getSource: vi.fn(() => ({
            getClusterLeaves: vi.fn(),
        })),
    }

    return { mockMap, mockFeatures }
}

// Test helpers
const createTestFeature = (overrides: Partial<any> = {}) => ({
    geometry: {
        type: 'Point',
        coordinates: [0, 0],
    },
    properties: {
        cluster: false,
        media_id: 'test-id',
        thumbnail: JSON.stringify({ url: 'test-url' }),
    },
    ...overrides,
})

describe('mapboxHelperFunctions', () => {
    let mockDispatch: React.Dispatch<PlacesAction>
    let consoleWarnSpy: any
    let consoleErrorSpy: any

    beforeEach(() => {
        mockDispatch = vi.fn()
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        // Reset mocks
        vi.clearAllMocks()
        document.createElement = vi.fn(() => ({
            _root: null,
        })) as any
    })

    afterEach(() => {
        consoleWarnSpy.mockRestore()
        consoleErrorSpy.mockRestore()
    })

    describe('registerMediaMarkers', () => {
        test('registers event handlers on the map', () => {
            const { mockMap } = createMockMap()

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            })

            // Should register 3 event handlers: move, moveend, sourcedata
            expect(mockMap.on).toHaveBeenCalledTimes(3)
            expect(mockMap.on).toHaveBeenCalledWith('move', expect.any(Function))
            expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function))
            expect(mockMap.on).toHaveBeenCalledWith('sourcedata', expect.any(Function))
        })

        test('initially calls updateMarkers function', () => {
            const { mockMap } = createMockMap()

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            })

            // updateMarkers is called one more time after registering event handlers
            expect(mockMap.querySourceFeatures).toHaveBeenCalledTimes(1)
        })
    })

    describe('makeUpdateMarkers', () => {
        test('creates and adds markers for features with valid data', () => {
            const { mockMap, mockFeatures } = createMockMap()
            const feature = createTestFeature()
            mockFeatures.push(feature)

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // Call registerMediaMarkers which internally calls makeUpdateMarkers
            registerMediaMarkers(args)

            // Should create a new marker
            expect(mockMapboxgl.Marker).toHaveBeenCalledTimes(1)
            expect(mockMarker.setLngLat).toHaveBeenCalledWith([0, 0])
            expect(mockMarker.addTo).toHaveBeenCalledWith(mockMap)
        })

        test('handles features with missing geometry', () => {
            const { mockMap, mockFeatures } = createMockMap()
            const featureWithoutGeometry = createTestFeature({ geometry: undefined })
            mockFeatures.push(featureWithoutGeometry)

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // Call registerMediaMarkers which internally calls makeUpdateMarkers
            registerMediaMarkers(args)

            // Should not create any markers and log a warning
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled()
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature had no geometry',
                expect.any(Object)
            )
        })

        test('handles features with non-Point geometry type', () => {
            const { mockMap, mockFeatures } = createMockMap()
            const featureWithLineGeometry = createTestFeature({
                geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
            })
            mockFeatures.push(featureWithLineGeometry)

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // Call registerMediaMarkers which internally calls makeUpdateMarkers
            registerMediaMarkers(args)

            // Should not create any markers and log a warning
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled()
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature geometry is not a Point',
                expect.any(Object)
            )
        })

        test('handles features with missing properties', () => {
            const { mockMap, mockFeatures } = createMockMap()
            const featureWithoutProps = createTestFeature({ properties: null })
            mockFeatures.push(featureWithoutProps)

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // Call registerMediaMarkers which internally calls makeUpdateMarkers
            registerMediaMarkers(args)

            // Should not create any markers and log a warning
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled()
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature had no properties',
                expect.any(Object)
            )
        })

        test('reuses existing markers for the same features', () => {
            const { mockMap, mockFeatures } = createMockMap()
            const feature = createTestFeature()
            mockFeatures.push(feature)

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // Call updateMarkers twice
            registerMediaMarkers(args)

            // Clear mocks to see what happens on second call
            vi.clearAllMocks()
            mockMap.querySourceFeatures.mockReturnValue(mockFeatures)

            // Call the event handler directly (simulate map movement)
            mockMap.on.mock.calls[0][1]()

            // Should not create new markers for existing features
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled()
        })

        test('removes markers that are no longer visible', () => {
            const { mockMap, mockFeatures } = createMockMap()
            const feature = createTestFeature()
            mockFeatures.push(feature)

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // First call to create markers
            registerMediaMarkers(args)

            // Clear the features and call again to simulate markers going out of view
            mockFeatures.length = 0
            mockMap.querySourceFeatures.mockReturnValue([])

            // Call the event handler directly
            mockMap.on.mock.calls[0][1]()

            // Should remove the marker
            expect(mockMarker.remove).toHaveBeenCalledTimes(1)
        })

        test('handles both cluster and media markers', () => {
            const { mockMap, mockFeatures } = createMockMap()

            const mediaFeature = createTestFeature({
                properties: {
                    cluster: false,
                    media_id: 'test-media-id',
                    thumbnail: JSON.stringify({ url: 'test-url' }),
                },
            })

            const clusterFeature = createTestFeature({
                properties: {
                    cluster: true,
                    cluster_id: 'test-cluster-id',
                    point_count_abbreviated: 5,
                    thumbnail: JSON.stringify({ url: 'test-url' }),
                },
            })

            mockFeatures.push(mediaFeature, clusterFeature)

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // Call registerMediaMarkers
            registerMediaMarkers(args)

            // Should create two markers with different IDs
            expect(mockMapboxgl.Marker).toHaveBeenCalledTimes(2)
        })

        test('handles error in createClusterPopupElement', () => {
            const { mockMap, mockFeatures } = createMockMap()
            const feature = createTestFeature()
            mockFeatures.push(feature)

            // Mock document.createElement to throw an error
            document.createElement = vi.fn(() => {
                throw new Error('Test error')
            }) as any

            const args = {
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            }

            // Call registerMediaMarkers
            registerMediaMarkers(args)

            // Should log an error and not create a marker
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to create cluster popup element:',
                expect.any(Error)
            )
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled()
        })
    })
})
