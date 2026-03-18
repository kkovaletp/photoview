import { gql, useLazyQuery } from '@apollo/client'
import { Dispatch, useEffect } from 'react'
import PresentView from '../../components/photoGallery/presentView/PresentView'
import type mapboxgl from 'mapbox-gl'
import { PresentMarker } from './PlacesPage'
import {
  PlacePageQueryMediaQuery,
  PlacePageQueryMediaQueryVariables,
} from './__generated__/MapPresentMarker'
import { MEDIA_GALLERY_FRAGMENT } from '../../components/photoGallery/MediaGallery'
import { PlacesAction, PlacesState } from './placesReducer'

const QUERY_MEDIA = gql`
  query placePageQueryMedia($mediaIDs: [ID!]!) {
    mediaList(ids: $mediaIDs) {
      ...MediaGalleryFields
    }
  }
  ${MEDIA_GALLERY_FRAGMENT}
`

const getMediaFromMarker = (map: mapboxgl.Map, presentMarker: PresentMarker) =>
  new Promise<MediaMarker[]>((resolve, reject) => {
    const { cluster, id } = presentMarker

    if (cluster) {
      const mediaSource = map.getSource('media') as mapboxgl.GeoJSONSource

      mediaSource.getClusterLeaves(id as number, 1000, 0, (error, features) => {
        if (error) {
          reject(error)
          return
        }

        const media = features.map(feat => feat.properties) as MediaMarker[]
        resolve(media)
      })
    } else {
      const features = map.querySourceFeatures('media')
      const media = features.find(f => f.properties?.media_id == id)
        ?.properties as MediaMarker | undefined

      if (media === undefined) {
        reject(new Error('ERROR: media is undefined'))
        return
      }

      resolve([media])
    }
  })

export interface MediaMarker {
  id: number
  thumbnail: string
  cluster: boolean
  point_count_abbreviated: number
  cluster_id: string
  media_id: string
}

type MapPresetMarkerProps = {
  map: mapboxgl.Map | null
  markerMediaState: PlacesState
  dispatchMarkerMedia: Dispatch<PlacesAction>
}

/**
 * Full-screen present-view that works with PlacesState
 */
const MapPresentMarker = ({
  map,
  markerMediaState,
  dispatchMarkerMedia,
}: MapPresetMarkerProps) => {
  const [loadMedia, { data: loadedMedia }] = useLazyQuery<
    PlacePageQueryMediaQuery,
    PlacePageQueryMediaQueryVariables
  >(QUERY_MEDIA)

  useEffect(() => {
    const presentMarker = markerMediaState.presentMarker
    if (presentMarker == null || map == null) {
      dispatchMarkerMedia({
        type: 'closePresentMode',
      })
      return
    }

    getMediaFromMarker(map, presentMarker).then(mediaMarkers => {
      loadMedia({
        variables: {
          mediaIDs: mediaMarkers.map(x => x.media_id),
        },
      })
    })
  }, [markerMediaState.presentMarker])

  useEffect(() => {
    const mediaList = loadedMedia?.mediaList || []
    dispatchMarkerMedia({
      type: 'replaceMedia',
      //TODO: how to fix the following type mismatch: "Type '{ __typename?: "Media" | undefined; id: string; title: string; blurhash?: string | null | undefined; type: MediaType; thumbnail?: { __typename?: "MediaURL" | undefined; url: string; width: number; height: number; } | null | undefined; highRes?: { ...; } | ... 1 more ... | undefined; videoWeb?: { ...; } | ... 1 more ...' is not assignable to type 'MediaGalleryFieldsFragment[]'.
      // Property 'favorite' is missing in type '{ __typename?: "Media" | undefined; id: string; title: string; blurhash?: string | null | undefined; type: MediaType; thumbnail?: { __typename?: "MediaURL" | undefined; url: string; width: number; height: number; } | null | undefined; highRes?: { ...; } | ... 1 more ... | undefined; videoWeb?: { ...; } | ... 1 more ...' but required in type 'MediaGalleryFieldsFragment'."?
      media: mediaList,
    })
    if (mediaList.length > 0) {
      dispatchMarkerMedia({
        type: 'openPresentMode',
        activeIndex: 0,
      })
    }
  }, [loadedMedia])

  if (markerMediaState.presenting) {
    return (
      <PresentView
        activeMedia={markerMediaState.media[markerMediaState.activeIndex]}
        dispatchMedia={dispatchMarkerMedia}
        disableSaveCloseInHistory={true}
      />
    )
  } else {
    return null
  }
}

export default MapPresentMarker
