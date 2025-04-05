// IMPORTANT: All vi.mock calls MUST come before any imports
// These mock definitions can't reference any variables defined in the test file
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
    })),
}));

vi.mock('../../Pages/PlacesPage/MapClusterMarker', () => ({
    default: vi.fn(() => null),
}));

// Now import React and everything else AFTER the mocks
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

// Create a marker tracking system that doesn't rely on accessing internal module state
const markerTracker = {
    // Store all markers created during a test
    created: new Map<string, mapboxgl.Marker>(),
    // Store markers currently on the map
    onMap: new Map<string, mapboxgl.Marker>(),
    // Reset for a new test
    reset() {
        this.created.clear();
        this.onMap.clear();
    }
};

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

const createMockMarker = (id?: string): mapboxgl.Marker => {
    const mockEl = createMockElement();
    const marker = {
        id,
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn((map) => {
            if (id) markerTracker.onMap.set(id, marker as any);
            return marker;
        }),
        remove: vi.fn(() => {
            if (id) markerTracker.onMap.delete(id);
        }),
        getElement: vi.fn(() => mockEl),
    } as unknown as mapboxgl.Marker;

    if (id) markerTracker.created.set(id, marker as any);
    return marker;
};

const createMockMapboxgl = () => {
    return {
        Marker: vi.fn(({ element }) => {
            // Extract ID from element's dataset if possible
            const id = element?.dataset?.id;
            return createMockMarker(id);
        }),
    } as unknown as typeof mapboxgl;
};

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

// Mock document.createElement to set dataset.id
const origCreateElement = document.createElement;
const mockCreateElement = (tagName: string) => {
    const el = origCreateElement.call(document, tagName) as HTMLElement;
    if (tagName === 'div') {
        // Add a dataset property for id tracking
        (el as any).dataset = { id: '' };
        (el as MarkerElement)._root = createMockRoot();
    }
    return el;
};

describe('mapboxHelperFunctions', () => {
    let mockDispatch: React.Dispatch<PlacesAction>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let mockMapboxgl: typeof mapboxgl;

    beforeEach(() => {
        // Reset marker tracking
        markerTracker.reset();

        // Create fresh mocks
        mockDispatch = vi.fn() as unknown as React.Dispatch<PlacesAction>;
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockMapboxgl = createMockMapboxgl();

        // Mock document.createElement
        document.createElement = vi.fn(mockCreateElement);

        // Reset MapClusterMarker mock
        vi.mocked(MapClusterMarker).mockImplementation(() => (
            <div data-testid="mock-cluster-marker" />
        ));
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
            const mockMarkerInstance = vi.mocked(mockMapboxgl.Marker).mock.results[0].value;
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

            const initialMarkerCount = vi.mocked(mockMapboxgl.Marker).mock.calls.length;

            // Clear mocks but keep the feature
            vi.clearAllMocks();

            // Call the event handler directly (simulate map movement)
            eventHandlers.move();

            // Should not create new markers for existing features
            expect(mockMapboxgl.Marker).not.toHaveBeenCalled();
        });

        test('removes markers that are no longer visible', () => {
            const { mockMap, mockFeatures, eventHandlers } = createMockMap();

            // First add a feature to create a marker
            const feature = createTestFeature();
            mockFeatures.push(feature);

            registerMediaMarkers({
                map: mockMap,
                mapboxLibrary: mockMapboxgl,
                dispatchMarkerMedia: mockDispatch,
            });

            // Get reference to the created marker
            const mockMarker = vi.mocked(mockMapboxgl.Marker).mock.results[0].value;

            // Now clear the features to simulate it going out of view
            mockFeatures.length = 0;

            // Reset mocks to clearly see what happens next
            vi.clearAllMocks();

            // Call the event handler directly
            eventHandlers.move();

            // The marker should be removed
            expect(mockMarker.remove).toHaveBeenCalled();
            expect(mockMarker.getElement()._root?.unmount).toHaveBeenCalled();
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

            // Should create two markers
            expect(mockMapboxgl.Marker).toHaveBeenCalledTimes(2);
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
