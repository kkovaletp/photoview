import * as Types from '../../../../__generated__/globalTypes'

export type SidebarMediaQueryQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
}>

export type SidebarMediaQueryQuery = {
  __typename?: 'Query'
  media: {
    __typename?: 'Media'
    id: string
    title: string
    type: Types.MediaType
    highRes?: {
      __typename?: 'MediaURL'
      url: string
      width: number
      height: number
    } | null
    thumbnail?: {
      __typename?: 'MediaURL'
      url: string
      width: number
      height: number
    } | null
    videoWeb?: {
      __typename?: 'MediaURL'
      url: string
      width: number
      height: number
    } | null
    videoMetadata?: {
      __typename?: 'VideoMetadata'
      id: string
      width: number
      height: number
      duration: number
      codec?: string | null
      framerate?: number | null
      bitrate?: string | null
      colorProfile?: string | null
      audio?: string | null
    } | null
    exif?: {
      __typename?: 'MediaEXIF'
      id: string
      description?: string | null
      camera?: string | null
      maker?: string | null
      lens?: string | null
      dateShot?: string | null
      exposure?: number | null
      aperture?: number | null
      iso?: number | null
      focalLength?: number | null
      flash?: number | null
      exposureProgram?: number | null
      coordinates?: {
        __typename?: 'Coordinates'
        latitude: number
        longitude: number
      } | null
    } | null
    album: {
      __typename?: 'Album'
      id: string
      title: string
      path: Array<{ __typename?: 'Album'; id: string; title: string }>
    }
    faces: Array<{
      __typename?: 'ImageFace'
      id: string
      rectangle: {
        __typename?: 'FaceRectangle'
        minX: number
        maxX: number
        minY: number
        maxY: number
      }
      faceGroup: {
        __typename?: 'FaceGroup'
        id: string
        label?: string | null
        imageFaceCount: number
      }
      media: {
        __typename?: 'Media'
        id: string
        title: string
        thumbnail?: {
          __typename?: 'MediaURL'
          url: string
          width: number
          height: number
        } | null
      }
    }>
  }
}
