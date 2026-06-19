import { useState, useRef, useEffect, forwardRef, HTMLProps } from 'react'
import { gql, useQuery } from '@apollo/client'
import type * as mapboxgl from 'mapbox-gl'
// `@ts-expect-error` – Vite ?worker import; no bundled type declaration
import MapboxWorker from 'mapbox-gl/dist/mapbox-gl-csp-worker?worker'
import styled from 'styled-components'

import 'mapbox-gl/dist/mapbox-gl.css'
import { MapboxTokenQuery } from './__generated__/MapboxMap'
import { isDarkMode } from '../../theme'
import { SetMapLanguages } from '../../localization'

const MAPBOX_TOKEN_QUERY = gql`
  query mapboxToken {
    mapboxToken
    myMediaGeoJson
  }
`

const MapContainer = styled.div`
  width: 100%;
  height: 100%;
`

const ForwardedMapContainer = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>((props, ref) => (
  <MapContainer {...props} ref={ref} />
))

type MapboxMapProps = {
  configureMapbox(map: mapboxgl.Map, mapboxLibrary: typeof mapboxgl): void
  mapboxOptions?: Partial<mapboxgl.MapOptions>
}

const useMapboxMap = ({
  configureMapbox,
  mapboxOptions = undefined,
}: MapboxMapProps) => {
  const [mapboxLibrary, setMapboxLibrary] = useState<typeof mapboxgl>()
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  const { data: mapboxData } = useQuery<MapboxTokenQuery>(MAPBOX_TOKEN_QUERY, {
    fetchPolicy: 'cache-first',
  })

  useEffect(() => {
    async function loadMapboxLibrary() {
      const mapbox = await import('mapbox-gl/esm')
      // Inject the CSP worker so Vite doesn't mangle the internal worker URL.
      // Without this the browser receives an HTML SPA-fallback response for
      // the worker script and refuses to execute it (MIME "text/html").
      //TODO: fix the "Property 'workerClass' does not exist on type '{ Evented: typeof Evented; LngLat: typeof LngLat; LngLatBounds: typeof LngLatBounds; TargetFeature: typeof TargetFeature; MercatorCoordinate: typeof MercatorCoordinate; ... 52 more ...; default: typeof import("/Users/kkoval/Documents/Repos/photoview/ui/node_modules/mapbox-gl/dist/esm/mapbox-gl"); }'."
      mapbox.workerClass = MapboxWorker as unknown as typeof mapbox.workerClass

      //TODO: fix the "Excessive stack depth comparing types '{ Evented: typeof Evented; LngLat: typeof LngLat; LngLatBounds: typeof LngLatBounds; TargetFeature: typeof TargetFeature; MercatorCoordinate: typeof MercatorCoordinate; ... 52 more ...; default: typeof import("/Users/kkoval/Documents/Repos/photoview/ui/node_modules/mapbox-gl/dist/esm/mapbox-gl"); }' and 'SetStateAction<typeof import("/Users/kkoval/Documents/Repos/photoview/ui/node_modules/mapbox-gl/dist/mapbox-gl") | undefined>'." and "Argument of type '{ Evented: typeof Evented; LngLat: typeof LngLat; LngLatBounds: typeof LngLatBounds; TargetFeature: typeof TargetFeature; MercatorCoordinate: typeof MercatorCoordinate; ... 52 more ...; default: typeof import("/Users/kkoval/Documents/Repos/photoview/ui/node_modules/mapbox-gl/dist/esm/mapbox-gl"); }' is not assignable to parameter of type 'SetStateAction<typeof import("/Users/kkoval/Documents/Repos/photoview/ui/node_modules/mapbox-gl/dist/mapbox-gl") | undefined>'.
      // Excessive stack depth comparing types '{ Evented: typeof Evented; LngLat: typeof LngLat; LngLatBounds: typeof LngLatBounds; TargetFeature: typeof TargetFeature; MercatorCoordinate: typeof MercatorCoordinate; ... 52 more ...; default: typeof import("/Users/kkoval/Documents/Repos/photoview/ui/node_modules/mapbox-gl/dist/esm/mapbox-gl"); }' and 'SetStateAction<typeof import("/Users/kkoval/Documents/Repos/photoview/ui/node_modules/mapbox-gl/dist/mapbox-gl") | undefined>'."
      setMapboxLibrary(mapbox)
    }
    loadMapboxLibrary()
  }, [])

  useEffect(() => {
    if (
      mapboxLibrary == null ||
      mapContainer.current == null ||
      mapboxData == null ||
      map.current != null
    ) {
      return
    }

    map.current = new mapboxLibrary.Map({
      container: mapContainer.current,
      style: isDarkMode()
        ? 'mapbox://styles/mapbox/dark-v10'
        : 'mapbox://styles/mapbox/streets-v11',
      ...(mapboxData.mapboxToken ? { accessToken: mapboxData.mapboxToken } : {}),
      ...mapboxOptions,
    })

    SetMapLanguages(map.current)

    configureMapbox(map.current, mapboxLibrary)
    map.current?.resize()
  }, [mapContainer, mapboxLibrary, mapboxData])

  map.current?.resize()

  return {
    mapContainer: <ForwardedMapContainer ref={mapContainer} />,
    mapboxMap: map.current,
    mapboxLibrary,
    mapboxToken: mapboxData?.mapboxToken ?? null,
  }
}

export default useMapboxMap
