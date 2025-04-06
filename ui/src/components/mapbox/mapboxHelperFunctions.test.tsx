// All vi.mock calls MUST come first - they get hoisted to the top of the file
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

vi.mock('../../Pages/PlacesPage/MapClusterMarker', () => ({
    default: vi.fn(() => <div data-testid="mock-cluster-marker" />),
}));

// Import after mocks
import React from 'react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { registerMediaMarkers } from './mapboxHelperFunctions'
import type mapboxgl from 'mapbox-gl'
import MapClusterMarker from '../../Pages/PlacesPage/MapClusterMarker'
import type { MediaMarker } from '../../Pages/PlacesPage/MapPresentMarker'
import type { PlacesAction } from '../../Pages/PlacesPage/placesReducer'
import { Root, createRoot } from 'react-dom/client'

// Define types
type MarkerElement = HTMLDivElement & {
    _root?: Root;
}

// Test helpers
const createMockElement = (): MarkerElement => {
    const el = document.createElement('div') as MarkerElement;
    el._root = {
        render: vi.fn(),
        unmount: vi.fn()
    };
    return el;
};

const createMockMarker = () => {
    const mockElement = createMockElement();
    return {
        setLngLat: vi.fn(function () { return this }),
        addTo: vi.fn(function () { return this }),
        remove: vi.fn(),
        getElement: vi.fn(() => mockElement),
    };
};

const createTestFeature = (overrides = {}) => ({
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
});

describe('mapboxHelperFunctions', () => {
    let mockDispatch: React.Dispatch<PlacesAction>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let mockMapboxgl: Record<string, any>;
    let mockMap: Record<string, any>;
    let mockFeatures: any[];
    let eventHandlers: Record<string, Function>;
    let mockMarker: ReturnType<typeof createMockMarker>;

    beforeEach(() => {
        // Reset for each test
        mockDispatch = vi.fn() as any;
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Create mock marker that will be returned by Marker constructor
        mockMarker = createMockMarker();

        // Set up mock mapboxgl
        mockMapboxgl = {
            Marker: vi.fn(() => mockMarker),
        };

        // Set up mock map and features
        mockFeatures = [];
        eventHandlers = {};
        mockMap = {
            on: vi.fn((event, handler) => {
                eventHandlers[event] = handler;
                return mockMap;
            }),
            querySourceFeatures: vi.fn(() => mockFeatures),
        };

        // Store original implementation before mocking
        const originalCreateElement = document.createElement;

        // Mock document.createElement for the div element
        document.createElement = vi.fn((tagName) => {
            if (tagName === 'div') {
                return createMockElement();
            }
            // Call the original directly
            return originalCreateElement.call(document, tagName);
        }) as any;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('registerMediaMarkers', () => {
        test('registers event handlers on the map', () => {
            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            expect(mockMap.on).toHaveBeenCalledTimes(3);
            expect(mockMap.on).toHaveBeenCalledWith('move', expect.any(Function));
            expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
            expect(mockMap.on).toHaveBeenCalledWith('sourcedata', expect.any(Function));
        });

        test('creates and adds markers for features with valid data', () => {
            // Prepare feature data
            const feature = createTestFeature();
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should create a marker and add it to the map
            expect(mockMapboxgl.Marker).toHaveBeenCalledTimes(1);
            expect(mockMarker.setLngLat).toHaveBeenCalledWith([0, 0]);
            expect(mockMarker.addTo).toHaveBeenCalledWith(mockMap);
        });

        test('handles features with missing geometry', () => {
            // Prepare feature with missing geometry
            const feature = createTestFeature({ geometry: undefined });
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should warn and not create marker
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature had no geometry',
                { feature }
            );
        });

        test('handles features with non-Point geometry type', () => {
            // Prepare feature with non-Point geometry
            const feature = createTestFeature({
                geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
            });
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should warn and not create marker
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature geometry is not a Point',
                { feature }
            );
        });

        test('handles features with missing properties', () => {
            // Prepare feature with missing properties
            const feature = createTestFeature({ properties: null });
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should warn and not create marker
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature had no properties',
                expect.objectContaining({
                    feature
                })
            );
        });

        test('reuses existing markers for the same features', () => {
            // First add a feature
            const feature = createTestFeature();
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Clear mocks and call the event handler again
            vi.clearAllMocks();

            // Simulate map movement (which triggers updateMarkers)
            eventHandlers.move();

            // No new markers should be created
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
        });

        test('removes markers that are no longer visible', () => {
            // First add a feature
            const feature = createTestFeature();
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Save reference to marker element
            const markerElement = mockMarker.getElement();

            // Clear features to simulate them going out of view
            mockFeatures.length = 0;

            // Reset mocks to see what happens on the next update
            vi.clearAllMocks();

            // Simulate map movement (which triggers updateMarkers)
            eventHandlers.move();

            // The marker should be removed
            expect(mockMarker.remove).toHaveBeenCalled();
            expect(markerElement._root?.unmount).toHaveBeenCalled();
        });

        test('handles both cluster and media markers', () => {
            // Add both cluster and media features
            const mediaFeature = createTestFeature({
                properties: {
                    cluster: false,
                    media_id: 'test-media-id',
                    thumbnail: JSON.stringify({ url: 'test-url' }),
                },
            });

            const clusterFeature = createTestFeature({
                properties: {
                    cluster: true,
                    cluster_id: 'test-cluster-id',
                    point_count_abbreviated: 5,
                    thumbnail: JSON.stringify({ url: 'test-url' }),
                },
            });

            mockFeatures.push(mediaFeature, clusterFeature);

            // We'll need two markers for this test
            const secondMarker = createMockMarker();
            mockMapboxgl.Marker.mockReturnValueOnce(mockMarker).mockReturnValueOnce(secondMarker);

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should create two markers
            expect(mockMapboxgl.Marker).toHaveBeenCalledTimes(2);
        });

        test('handles error in createClusterPopupElement', () => {
            // Add a feature
            const feature = createTestFeature();
            mockFeatures.push(feature);

            // Make document.createElement throw an error
            document.createElement = vi.fn().mockImplementation(() => {
                throw new Error('Test error');
            }) as any;

            registerMediaMarkers({
                map: mockMap as any,
                mapboxLibrary: mockMapboxgl as any,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should log error and not create a marker
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to create cluster popup element:',
                expect.any(Error)
            );
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
        });
    });
});
