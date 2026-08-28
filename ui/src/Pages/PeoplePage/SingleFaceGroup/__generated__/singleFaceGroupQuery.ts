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
  __typename: 'Query'
  faceGroup: {
    __typename: 'FaceGroup'
    id: string
    label: string | null
    imageFaces: Array<{
      __typename: 'ImageFace'
      id: string
      rectangle: {
        __typename: 'FaceRectangle'
        minX: number
        maxX: number
        minY: number
        maxY: number
      }
      media: {
        __typename: 'Media'
        title: string
        id: string
        type: Types.MediaType
        blurhash: string | null
        favorite: boolean
        thumbnail: {
          __typename: 'MediaURL'
          url: string
          width: number
          height: number
        } | null
        highRes: { __typename: 'MediaURL'; url: string } | null
        videoWeb: { __typename: 'MediaURL'; url: string } | null
      }
    }>
  }
}
