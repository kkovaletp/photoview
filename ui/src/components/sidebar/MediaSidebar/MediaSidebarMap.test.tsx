import { vi, describe, test, expect, beforeEach } from 'vitest'

// ─── Hoisted mocks (must precede vi.mock calls) ───────────────────────────────
const mockUseTranslation = vi.hoisted(() => vi.fn())
const mockUseMapboxMap = vi.hoisted(() => vi.fn())

vi.mock('react-i18next', () => ({
    useTranslation: mockUseTranslation,
}))

vi.mock('../../mapbox/MapboxMap', () => ({
    default: mockUseMapboxMap,
}))

mockUseTranslation.mockReturnValue({
    t: (key: string, defaultValue: string) => defaultValue,
    i18n: { language: 'en' },
})

// ─── Imports ──────────────────────────────────────────────────────────────────
import { render, screen } from '@testing-library/react'
import MediaSidebarMap from './MediaSidebarMap'
import type { SidebarMediaQueryQuery } from './__generated__/MediaSidebar'

// ─── Types & fixtures ─────────────────────────────────────────────────────────
type CoordinatesType = NonNullable<SidebarMediaQueryQuery['media']['exif']>['coordinates']

const validCoordinates: CoordinatesType = {
    __typename: 'Coordinates',
    latitude: 41.40338,
    longitude: 2.17403,
}

function makeMapboxReturn(mapboxToken: string | null = 'test-mapbox-token') {
    return {
        mapContainer: <div data-testid="map-container" />,
        mapboxMap: null,
        mapboxLibrary: undefined,
        mapboxToken,
    }
}

function makeMockMapLib() {
    const mockNavControl = {}
    const mockMarkerInstance = {
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
    }
    const mockMap = { addControl: vi.fn() }
    const NavigationControl = vi.fn(() => mockNavControl)
    const Marker = vi.fn(() => mockMarkerInstance)
    return { mockMap, NavigationControl, Marker, mockMarkerInstance, mockNavControl }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('MediaSidebarMap', () => {
    beforeEach(() => {
        mockUseMapboxMap.mockReset()
        mockUseMapboxMap.mockReturnValue(makeMapboxReturn())
    })

    describe('null rendering conditions', () => {
        test('renders nothing when coordinates is null', () => {
            const { container } = render(<MediaSidebarMap coordinates={null} />)
            expect(container.firstChild).toBeNull()
        })

        test('renders nothing when coordinates is undefined', () => {
            const { container } = render(<MediaSidebarMap coordinates={undefined} />)
            expect(container.firstChild).toBeNull()
        })

        test('renders nothing when mapboxToken is null, even with valid coordinates', () => {
            mockUseMapboxMap.mockReturnValue(makeMapboxReturn(null))
            const { container } = render(<MediaSidebarMap coordinates={validCoordinates} />)
            expect(container.firstChild).toBeNull()
        })
    })

    describe('renders location section with valid data', () => {
        test('shows Location title and map container when coordinates and token are present', () => {
            render(<MediaSidebarMap coordinates={validCoordinates} />)
            expect(screen.getByText('Location')).toBeInTheDocument()
            expect(screen.getByTestId('map-container')).toBeInTheDocument()
        })
    })

    describe('mapbox options passed to useMapboxMap', () => {
        test('always passes non-interactive options with zoom 12', () => {
            render(<MediaSidebarMap coordinates={validCoordinates} />)
            expect(mockUseMapboxMap).toHaveBeenCalledWith(
                expect.objectContaining({
                    mapboxOptions: expect.objectContaining({
                        interactive: false,
                        zoom: 12,
                    }),
                })
            )
        })

        test('passes actual lat/lng as map center when coordinates are valid', () => {
            render(<MediaSidebarMap coordinates={validCoordinates} />)
            expect(mockUseMapboxMap).toHaveBeenCalledWith(
                expect.objectContaining({
                    mapboxOptions: expect.objectContaining({
                        center: {
                            lat: validCoordinates!.latitude,
                            lng: validCoordinates!.longitude,
                        },
                    }),
                })
            )
        })

        test('passes { lat: 0, lng: 0 } as center when coordinates are null', () => {
            render(<MediaSidebarMap coordinates={null} />)
            expect(mockUseMapboxMap).toHaveBeenCalledWith(
                expect.objectContaining({
                    mapboxOptions: expect.objectContaining({
                        center: { lat: 0, lng: 0 },
                    }),
                })
            )
        })

        test('passes { lat: 0, lng: 0 } as center when coordinates are undefined', () => {
            render(<MediaSidebarMap coordinates={undefined} />)
            expect(mockUseMapboxMap).toHaveBeenCalledWith(
                expect.objectContaining({
                    mapboxOptions: expect.objectContaining({
                        center: { lat: 0, lng: 0 },
                    }),
                })
            )
        })
    })

    describe('configureMapbox callback behavior', () => {
        type CaptureResult = { getCb: () => ((map: any, lib: any) => void) | undefined }

        function captureConfigureMapbox(): CaptureResult {
            let capturedCb: ((map: any, lib: any) => void) | undefined
            mockUseMapboxMap.mockImplementation(
                ({ configureMapbox }: { configureMapbox: (map: any, lib: any) => void }) => {
                    capturedCb = configureMapbox
                    return makeMapboxReturn()
                }
            )
            return { getCb: () => capturedCb }
        }

        test('returns early without adding controls or marker when coordinates are null', () => {
            const { getCb } = captureConfigureMapbox()
            render(<MediaSidebarMap coordinates={null} />)

            const { mockMap, NavigationControl, Marker } = makeMockMapLib()
            getCb()!(mockMap, { NavigationControl, Marker })

            expect(mockMap.addControl).not.toHaveBeenCalled()
            expect(Marker).not.toHaveBeenCalled()
        })

        test('returns early without adding controls or marker when coordinates are undefined', () => {
            const { getCb } = captureConfigureMapbox()
            render(<MediaSidebarMap coordinates={undefined} />)

            const { mockMap, NavigationControl, Marker } = makeMockMapLib()
            getCb()!(mockMap, { NavigationControl, Marker })

            expect(mockMap.addControl).not.toHaveBeenCalled()
            expect(Marker).not.toHaveBeenCalled()
        })

        test('adds NavigationControl without compass when coordinates are valid', () => {
            const { getCb } = captureConfigureMapbox()
            render(<MediaSidebarMap coordinates={validCoordinates} />)

            const { mockMap, NavigationControl, Marker, mockNavControl } = makeMockMapLib()
            getCb()!(mockMap, { NavigationControl, Marker })

            expect(NavigationControl).toHaveBeenCalledWith({ showCompass: false })
            expect(mockMap.addControl).toHaveBeenCalledWith(mockNavControl)
        })

        test('creates a red marker at correct coordinates and adds it to the map', () => {
            const { getCb } = captureConfigureMapbox()
            render(<MediaSidebarMap coordinates={validCoordinates} />)

            const { mockMap, NavigationControl, Marker, mockMarkerInstance } = makeMockMapLib()
            getCb()!(mockMap, { NavigationControl, Marker })

            expect(Marker).toHaveBeenCalledWith({ color: 'red', scale: 0.8 })
            expect(mockMarkerInstance.setLngLat).toHaveBeenCalledWith({
                lat: validCoordinates!.latitude,
                lng: validCoordinates!.longitude,
            })
            expect(mockMarkerInstance.addTo).toHaveBeenCalledWith(mockMap)
        })
    })
})
