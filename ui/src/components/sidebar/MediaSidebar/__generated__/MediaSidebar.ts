/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../../__generated__/globalTypes'

export type MediaType = 'Photo' | 'Video'

export type SidebarMediaQueryQueryVariables = Exact<{
  id: string | number
}>

export type SidebarMediaQueryQuery = {
  media: {
    id: string
    title: string
    type: Types.MediaType
    highRes: { url: string; width: number; height: number } | null
    thumbnail: { url: string; width: number; height: number } | null
    videoWeb: { url: string; width: number; height: number } | null
    videoMetadata: {
      id: string
      width: number
      height: number
      duration: number
      codec: string | null
      framerate: number | null
      bitrate: string | null
      colorProfile: string | null
      audio: string | null
    } | null
    exif: {
      id: string
      description: string | null
      camera: string | null
      maker: string | null
      lens: string | null
      dateShot: string | null
      exposure: number | null
      aperture: number | null
      iso: number | null
      focalLength: number | null
      flash: number | null
      exposureProgram: number | null
      coordinates: { latitude: number; longitude: number } | null
    } | null
    album: {
      id: string
      title: string
      path: Array<{ id: string; title: string }>
    }
    faces: Array<{
      id: string
      rectangle: { minX: number; maxX: number; minY: number; maxY: number }
      faceGroup: { id: string; label: string | null; imageFaceCount: number }
      media: {
        id: string
        title: string
        thumbnail: { url: string; width: number; height: number } | null
      }
    }>
  }
}
