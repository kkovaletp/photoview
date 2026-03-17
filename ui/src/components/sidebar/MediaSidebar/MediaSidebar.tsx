import { gql, useLazyQuery } from '@apollo/client'
import { useEffect, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { authToken } from '../../../helpers/authentication'
import { isNil } from '../../../helpers/utils'
import { MediaType } from '../../../__generated__/globalTypes'
import { SidebarFacesOverlay } from '../../facesOverlay/FacesOverlay'
import { SidebarContext } from '../Sidebar'
import {
  ProtectedImage,
  ProtectedVideo,
  ProtectedVideoPropsMedia,
} from '../../photoGallery/ProtectedMedia'
import { SidebarPhotoCover } from '../AlbumCovers'
import { SidebarPhotoShare } from '../Sharing'
import SidebarMediaDownload from '../SidebarDownloadMedia'
import SidebarHeader from '../SidebarHeader'
import { SidebarDownloadQueryQuery } from '../__generated__/SidebarDownloadMedia'
import ExifDetails from './MediaSidebarExif'
import MediaSidebarPeople from './MediaSidebarPeople'
import MediaSidebarMap from './MediaSidebarMap'
import {
  SidebarMediaQueryQuery,
  SidebarMediaQueryQueryVariables
} from './__generated__/MediaSidebar'
import { BreadcrumbList } from '../../album/AlbumTitle'

export const SIDEBAR_MEDIA_QUERY = gql`
  query sidebarMediaQuery($id: ID!) {
    media(id: $id) {
      id
      title
      type
      highRes {
        url
        width
        height
      }
      thumbnail {
        url
        width
        height
      }
      videoWeb {
        url
        width
        height
      }
      videoMetadata {
        id
        width
        height
        duration
        codec
        framerate
        bitrate
        colorProfile
        audio
      }
      exif {
        id
        description
        camera
        maker
        lens
        dateShot
        exposure
        aperture
        iso
        focalLength
        flash
        exposureProgram
        coordinates {
          latitude
          longitude
        }
      }
      album {
        id
        title
        path {
          id
          title
        }
      }
      faces {
        id
        rectangle {
          minX
          maxX
          minY
          maxY
        }
        faceGroup {
          id
          label
          imageFaceCount
        }
        media {
          id
          title
          thumbnail {
            url
            width
            height
          }
        }
      }
    }
  }
`

const PreviewImage = styled(ProtectedImage)`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  object-fit: contain;
`

const PreviewVideo = styled(ProtectedVideo)`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
`

interface PreviewMediaPropsMedia extends ProtectedVideoPropsMedia {
  type: MediaType
}

type PreviewMediaProps = {
  media: PreviewMediaPropsMedia
  previewImage?: {
    url: string
  }
}

const PreviewMedia = ({ media, previewImage }: PreviewMediaProps) => {
  const { t } = useTranslation()
  if (media.type === MediaType.Photo) {
    return <PreviewImage src={previewImage?.url} />
  }

  if (media.type === MediaType.Video) {
    return <PreviewVideo media={media} />
  }

  return <div>{t('sidebar.media.unknown_type', 'ERROR: Unknown media type: {{type}}', { type: media.type })}</div>
}

type SidebarContentProps = {
  media: MediaSidebarMedia
  hidePreview?: boolean
}

const SidebarContent = ({ media, hidePreview }: SidebarContentProps) => {
  const { updateSidebar } = useContext(SidebarContext)
  const { t } = useTranslation()
  let previewImage = null
  if (media.highRes) previewImage = media.highRes
  else if (media.thumbnail) previewImage = media.thumbnail

  const imageAspect =
    previewImage?.width && previewImage?.height
      ? previewImage.height / previewImage.width
      : 3 / 2

  let sidebarMap = null
  const mediaCoordinates = media.exif?.coordinates
  if (mediaCoordinates) {
    sidebarMap = <MediaSidebarMap coordinates={mediaCoordinates} />
  }

  let albumPath = null
  const mediaAlbum = media.album
  if (!isNil(mediaAlbum)) {
    const pathElms = [
      ...[...(mediaAlbum.path ?? [])].reverse(),
      mediaAlbum,
    ].map(album => (
      <li key={album.id} className="inline-block hover:underline">
        <Link
          className="text-blue-900 dark:text-blue-200 hover:underline"
          to={`/album/${album.id}`}
          onClick={() => updateSidebar(null)}
        >
          {album.title}
        </Link>
      </li>
    ))

    albumPath = (
      <div className="mx-4 my-4">
        <h2 className="uppercase text-xs text-gray-900 dark:text-gray-300 font-semibold">
          {t('sidebar.media.album_path', 'Album path')}
        </h2>
        <BreadcrumbList $hideLastArrow={true}>{pathElms}</BreadcrumbList>
      </div>
    )
  }

  return (
    <div>
      <SidebarHeader title={media.title ?? 'Loading...'} />
      <div className="lg:mx-4">
        {!hidePreview && (
          <div
            className="w-full h-0 relative"
            style={{ paddingTop: `${Math.min(imageAspect, 0.75) * 100}%` }}
          >
            <PreviewMedia
              previewImage={previewImage || undefined}
              media={media}
            />
            <SidebarFacesOverlay media={media} />
          </div>
        )}
      </div>
      <ExifDetails media={media} />
      {albumPath}
      <MediaSidebarPeople media={media} />
      {sidebarMap}
      <SidebarMediaDownload media={media} />
      <SidebarPhotoShare id={media.id} />
      <div className="mt-8">
        <SidebarPhotoCover cover_id={media.id} />
      </div>
    </div>
  )
}

export interface MediaSidebarMedia {
  __typename?: 'Media'
  id: string
  title?: string
  type: MediaType
  highRes?: null | {
    __typename?: 'MediaURL'
    url: string
    width?: number
    height?: number
  }
  thumbnail?: SidebarMediaQueryQuery['media']['thumbnail'] | null
  videoWeb?: null | {
    __typename?: 'MediaURL'
    url: string
    width?: number
    height?: number
  }
  videoMetadata?: SidebarMediaQueryQuery['media']['videoMetadata'] | null
  exif?: SidebarMediaQueryQuery['media']['exif'] | null
  faces?: SidebarMediaQueryQuery['media']['faces'][]
  downloads?: SidebarDownloadQueryQuery['media']['downloads']
  album?: {
    __typename: 'Album'
    id: string
    title: string
    path?: SidebarMediaQueryQuery['media']['album']['path']
  }
}

type MediaSidebarType = {
  media: MediaSidebarMedia
  hidePreview?: boolean
}

const MediaSidebar = ({ media, hidePreview }: MediaSidebarType) => {
  const { t } = useTranslation()
  const [loadMedia, { loading, error, data }] = useLazyQuery<
    SidebarMediaQueryQuery,
    SidebarMediaQueryQueryVariables
  >(SIDEBAR_MEDIA_QUERY)

  useEffect(() => {
    if (media != null && authToken()) {
      loadMedia({
        variables: {
          id: media.id,
        },
      })
    }
  }, [media, loadMedia])

  if (!media) return null

  if (!authToken()) {
    return <SidebarContent media={media} hidePreview={hidePreview} />
  }

  if (error) return (
    <div className="p-4 text-red-600 dark:text-red-400">
      {t('sidebar.error', 'Error loading media details: {{message}}', { message: error.message })}
    </div>
  )

  if (loading || data == null) {
    return <SidebarContent media={media} hidePreview={hidePreview} />
  }

  //TODO: how to fix the "Type '{ __typename?: "Media" | undefined; id: string; title: string; type: MediaType; highRes?: { __typename?: "MediaURL" | undefined; url: string; width: number; height: number; } | null | undefined; ... 5 more ...; faces: { ...; }[]; }' is not assignable to type 'MediaSidebarMedia'.
  // Types of property 'faces' are incompatible.
  //   Type '{ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; faceGroup: { __typename?: "FaceGroup" | undefined; id: string; label?: string | ... 1 more ... | undefined; imageFaceCount: number; }; media: { ...; };...' is not assignable to type '{ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; faceGroup: { __typename?: "FaceGroup" | undefined; id: string; label?: string | ... 1 more ... | undefined; imageFaceCount: number; }; media: { ...; };...'.Two different types with this name exist, but they are unrelated.
  //     Type '{ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; faceGroup: { __typename?: "FaceGroup" | undefined; id: string; label?: string | ... 1 more ... | undefined; imageFaceCount: number; }; media: { ...; }; }' is missing the following properties from type '{ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; faceGroup: { __typename?: "FaceGroup" | undefined; id: string; label?: string | ... 1 more ... | undefined; imageFaceCount: number; }; media: { ...; };...': length, pop, push, concat, and 35 more." error?
  return <SidebarContent media={data.media} hidePreview={hidePreview} />
}

export default MediaSidebar
