import { useState, useRef, useEffect, forwardRef, HTMLProps } from 'react'
import { gql, useQuery } from '@apollo/client'
import type mapboxgl from 'mapbox-gl'
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
      const mapbox = (await import('mapbox-gl/esm')).default

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

    if (mapboxData.mapboxToken)
      mapboxLibrary.accessToken = mapboxData.mapboxToken

    map.current = new mapboxLibrary.Map({
      container: mapContainer.current,
      style: isDarkMode()
        ? 'mapbox://styles/mapbox/dark-v10'
        : 'mapbox://styles/mapbox/streets-v11',
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
