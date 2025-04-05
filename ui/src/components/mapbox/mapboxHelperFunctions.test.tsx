import React from 'react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { registerMediaMarkers } from './mapboxHelperFunctions'
import type mapboxgl from 'mapbox-gl'
import MapClusterMarker from '../../Pages/PlacesPage/MapClusterMarker'
import type { MediaMarker } from '../../Pages/PlacesPage/MapPresentMarker'
import type { PlacesAction } from '../../Pages/PlacesPage/placesReducer'
import { Root, createRoot } from 'react-dom/client'

// Define types needed for testing
type MarkerElement = HTMLDivElement & {
    _root?: Root;
}

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}))

// Mock MapClusterMarker component
vi.mock('../../Pages/PlacesPage/MapClusterMarker', () => ({
    default: vi.fn(() => <div data-testid="mock-cluster-marker" />),
}))

// Create module variables for testing
// These need to be reset between tests
let markers: Record<string, mapboxgl.Marker> = {};
let markersOnScreen: Record<string, mapboxgl.Marker> = {};

// Override the module's variables to use our testing versions
// Fixed error 1: Removed the third argument { virtual: true }
vi.mock('./mapboxHelperFunctions', async (importOriginal) => {
    const original = await importOriginal<typeof import('./mapboxHelperFunctions')>();
    return {
        ...original,
        markers,
        markersOnScreen,
    };
});

// Test setup functions
const createMockRoot = (): Root => ({
    render: vi.fn(),
    unmount: vi.fn(),
});

const createMockElement = (): MarkerElement => {
    const el = document.createElement('div') as MarkerElement;
    el._root = createMockRoot();
    return el;
};

const createMockMarker = (): mapboxgl.Marker => {
    const mockEl = createMockElement();
    return {
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        getElement: vi.fn(() => mockEl),
    } as unknown as mapboxgl.Marker;
};

const createMockMapboxgl = () => ({
    Marker: vi.fn().mockImplementation(() => createMockMarker()),
}) as unknown as typeof mapboxgl;

const createMockMap = () => {
    const mockFeatures: any[] = [];
    const eventHandlers: Record<string, () => void> = {};

    const mockMap = {
        on: vi.fn((event: string, handler: () => void) => {
            eventHandlers[event] = handler;
            return mockMap;
        }),
        off: vi.fn(),
        querySourceFeatures: vi.fn(() => mockFeatures),
        getSource: vi.fn(() => ({
            getClusterLeaves: vi.fn(),
        })),
    } as unknown as mapboxgl.Map;

    return { mockMap, mockFeatures, eventHandlers };
};

// Utility to create test feature data
const createTestFeature = (overrides: Record<string, any> = {}) => ({
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
    let mockMapboxgl: typeof mapboxgl;

    beforeEach(() => {
        // Reset module state for each test
        markers = {};
        markersOnScreen = {};

        // Create fresh mocks
        mockDispatch = vi.fn() as unknown as React.Dispatch<PlacesAction>;
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockMapboxgl = createMockMapboxgl();

        // Mock document.createElement
        const origCreateElement = document.createElement;
        document.createElement = vi.fn((tagName: string) => {
            const el = origCreateElement.call(document, tagName);
            if (tagName === 'div') {
                (el as MarkerElement)._root = createMockRoot();
            }
            return el;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('registerMediaMarkers', () => {
        test('registers event handlers on the map', () => {
            const { mockMap } = createMockMap();

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should register 3 event handlers
            expect(mockMap.on).toHaveBeenCalledTimes(3);
            expect(mockMap.on).toHaveBeenCalledWith('move', expect.any(Function));
            expect(mockMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
            expect(mockMap.on).toHaveBeenCalledWith('sourcedata', expect.any(Function));
        });

        test('initially calls updateMarkers function', () => {
            const { mockMap } = createMockMap();

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should query source features on initialization
            expect(mockMap.querySourceFeatures).toHaveBeenCalledWith('media');
            expect(mockMap.querySourceFeatures).toHaveBeenCalledTimes(1);
        });
    });

    describe('makeUpdateMarkers', () => {
        test('creates and adds markers for features with valid data', () => {
            const { mockMap, mockFeatures } = createMockMap();
            const feature = createTestFeature();
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should create a marker and add it to the map
            expect(mockMapboxgl.Marker).toHaveBeenCalledTimes(1);
            const mockMarkerInstance = (mockMapboxgl.Marker as ReturnType<typeof vi.fn>).mock.results[0].value;
            expect(mockMarkerInstance.setLngLat).toHaveBeenCalledWith([0, 0]);
            expect(mockMarkerInstance.addTo).toHaveBeenCalledWith(mockMap);
        });

        test('handles features with missing geometry', () => {
            const { mockMap, mockFeatures } = createMockMap();
            const featureWithoutGeometry = createTestFeature({ geometry: undefined });
            mockFeatures.push(featureWithoutGeometry);

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should warn and not create marker
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature had no geometry',
                { feature: featureWithoutGeometry }
            );
        });

        test('handles features with non-Point geometry type', () => {
            const { mockMap, mockFeatures } = createMockMap();
            const featureWithLineGeometry = createTestFeature({
                geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
            });
            mockFeatures.push(featureWithLineGeometry);

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should warn and not create marker
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature geometry is not a Point',
                { feature: featureWithLineGeometry }
            );
        });

        test('handles features with missing properties', () => {
            const { mockMap, mockFeatures } = createMockMap();
            const featureWithoutProps = createTestFeature({ properties: null });
            mockFeatures.push(featureWithoutProps);

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should warn and not create marker
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'WARN: geojson feature had no properties',
                expect.objectContaining({
                    feature: featureWithoutProps
                })
            );
        });

        test('reuses existing markers for the same features', () => {
            const { mockMap, mockFeatures, eventHandlers } = createMockMap();
            const feature = createTestFeature();
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Clear mocks to see what happens on second call
            vi.clearAllMocks();

            // Call the event handler directly (simulate map movement)
            eventHandlers.move();

            // Should not create new markers for existing features
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
        });

        test('removes markers that are no longer visible', () => {
            const { mockMap, mockFeatures, eventHandlers } = createMockMap();
            const feature = createTestFeature();
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Clear the features for next call to simulate markers going out of view
            mockFeatures.length = 0;

            // Store a reference to created marker before clearing mocks
            const mockMarker = Object.values(markers)[0];

            // Setup markersOnScreen to match what would be there after first call
            markersOnScreen = { ...markers };

            // Call the event handler directly
            eventHandlers.move();

            // Should remove the marker
            expect(mockMarker.remove).toHaveBeenCalled();
            // Fixed error 2: Properly cast to MarkerElement before accessing _root
            const markerElement = mockMarker.getElement() as MarkerElement;
            expect(markerElement._root?.unmount).toHaveBeenCalled();
        });

        test('handles both cluster and media markers', () => {
            const { mockMap, mockFeatures } = createMockMap();

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

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should create two markers with different IDs
            expect(mockMapboxgl.Marker).toHaveBeenCalledTimes(2);

            // Verify markers were created with correct IDs
            expect(Object.keys(markers)).toHaveLength(2);
            expect(Object.keys(markers)).toContain('media_test-media-id');
            expect(Object.keys(markers)).toContain('cluster_test-cluster-id');
        });

        test('handles error in createClusterPopupElement', () => {
            const { mockMap, mockFeatures } = createMockMap();
            const feature = createTestFeature();
            mockFeatures.push(feature);

            // Force an error in document.createElement
            document.createElement = vi.fn().mockImplementation(() => {
                throw new Error('Test error');
            });

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Should log error and not create marker
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to create cluster popup element:',
                expect.any(Error)
            );
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
        });
    });
});
