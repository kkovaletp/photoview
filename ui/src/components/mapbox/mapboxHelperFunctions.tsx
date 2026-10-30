import type * as mapboxgl from 'mapbox-gl/esm'
import type { Dispatch } from 'react'
import { createRoot } from 'react-dom/client'
import MapClusterMarker from '../../Pages/PlacesPage/MapClusterMarker'
import type { MediaMarker } from '../../Pages/PlacesPage/MapPresentMarker'
import type { PlacesAction } from '../../Pages/PlacesPage/placesReducer'

type RegisterMediaMarkersArgs = {
  map: mapboxgl.Map
  mapboxLibrary: typeof mapboxgl
  dispatchMarkerMedia: Dispatch<PlacesAction>
}

type MarkerEntry = {
  marker: mapboxgl.Marker
  root: ReturnType<typeof createRoot>
  coordinates: [number, number]
}

/**
 * Register media markers for one map.
 * The returned function can also dispose the registration explicitly.
 */
export const registerMediaMarkers = ({
  map,
  mapboxLibrary,
  dispatchMarkerMedia,
}: RegisterMediaMarkersArgs) => {
  const markers = new Map<string, MarkerEntry>()
  let disposed = false

  const updateMarkers = () => {
    if (disposed || !map.getSource('media')) {
      return
    }

    const nextIds = new Set<string>()
    const features = map.querySourceFeatures('media')

    for (const feature of features) {
      if (!feature.geometry) {
        console.warn('WARN: geojson feature had no geometry', { feature })
        continue
      }

      if (feature.geometry.type !== 'Point') {
        console.warn('WARN: geojson feature geometry is not a Point', { feature })
        continue
      }

      const props = feature.properties as MediaMarker | null
      if (props == null) {
        console.warn('WARN: geojson feature had no properties', {
          feature,
          geometry: feature.geometry,
          coordinates: feature.geometry.coordinates,
        })
        continue
      }

      const id = props.cluster
        ? `cluster_${props.cluster_id}`
        : `media_${props.media_id}`

      // A source query can return the same feature from multiple tiles.
      if (nextIds.has(id)) {
        continue
      }
      nextIds.add(id)

      const coordinates: [number, number] = [
        feature.geometry.coordinates[0],
        feature.geometry.coordinates[1],
      ]

      let entry = markers.get(id)

      if (!entry) {
        const element = document.createElement('div')
        const root = createRoot(element)

        root.render(
          <MapClusterMarker
            marker={props}
            dispatchMarkerMedia={dispatchMarkerMedia}
          />
        )

        const marker = new mapboxLibrary.Marker({ element })
          .setLngLat(coordinates)
          .addTo(map)

        entry = { marker, root, coordinates }
        markers.set(id, entry)
      } else if (
        entry.coordinates[0] !== coordinates[0] ||
        entry.coordinates[1] !== coordinates[1]
      ) {
        entry.marker.setLngLat(coordinates)
        entry.coordinates = coordinates
      }
    }

    for (const [id, entry] of markers) {
      if (!nextIds.has(id)) {
        entry.marker.remove()
        entry.root.unmount()
        markers.delete(id)
      }
    }
  }

  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true

    map.off('move', updateMarkers)
    map.off('moveend', updateMarkers)
    map.off('sourcedata', updateMarkers)
    map.off('remove', dispose)

    const entries = [...markers.values()]
    markers.clear()

    for (const entry of entries) {
      entry.marker.remove()
    }

    // Map removal can run during the parent React tree's cleanup.
    // Unmount independent roots after that cleanup completes.
    queueMicrotask(() => {
      for (const entry of entries) {
        entry.root.unmount()
      }
    })
  }

  map.on('move', updateMarkers)
  map.on('moveend', updateMarkers)
  map.on('sourcedata', updateMarkers)
  map.on('remove', dispose)
  updateMarkers()

  return dispose
}
