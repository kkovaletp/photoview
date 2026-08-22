/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type MediaType = 'Photo' | 'Video'

export type PlacePageQueryMediaQueryVariables = Exact<{
  mediaIDs: Array<string | number> | string | number
}>

export type PlacePageQueryMediaQuery = {
  mediaList: Array<{
    id: string
    type: Types.MediaType
    blurhash: string | null
    favorite: boolean
    thumbnail: { url: string; width: number; height: number } | null
    highRes: { url: string } | null
    videoWeb: { url: string } | null
  }>
}
