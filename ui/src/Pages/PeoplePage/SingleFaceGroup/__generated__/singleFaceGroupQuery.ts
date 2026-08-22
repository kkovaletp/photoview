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

export type SingleFaceGroupQueryVariables = Exact<{
  id: string | number
  limit: number
  offset: number
}>

export type SingleFaceGroupQuery = {
  faceGroup: {
    id: string
    label: string | null
    imageFaces: Array<{
      id: string
      rectangle: { minX: number; maxX: number; minY: number; maxY: number }
      media: {
        title: string
        id: string
        type: Types.MediaType
        blurhash: string | null
        favorite: boolean
        thumbnail: { url: string; width: number; height: number } | null
        highRes: { url: string } | null
        videoWeb: { url: string } | null
      }
    }>
  }
}
