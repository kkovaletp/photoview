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

/** Used to specify which order to sort items in */
export type OrderDirection =
  /** Sort accending A-Z */
  | 'ASC'
  /** Sort decending Z-A */
  | 'DESC'

export type AlbumQueryQueryVariables = Exact<{
  id: string | number
  onlyFavorites?: boolean | null | undefined
  mediaOrderBy?: string | null | undefined
  orderDirection?: Types.OrderDirection | null | undefined
  limit?: number | null | undefined
  offset?: number | null | undefined
}>

export type AlbumQueryQuery = {
  __typename: 'Query'
  album: {
    __typename: 'Album'
    id: string
    title: string
    subAlbums: Array<{
      __typename: 'Album'
      id: string
      title: string
      thumbnail: {
        __typename: 'Media'
        id: string
        thumbnail: { __typename: 'MediaURL'; url: string } | null
      } | null
    }>
    media: Array<{
      __typename: 'Media'
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
    }>
  }
}
