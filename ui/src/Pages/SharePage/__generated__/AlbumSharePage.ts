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

export type ShareAlbumQueryQueryVariables = Exact<{
  id: string | number
  token: string
  password?: string | null | undefined
  limit: number
  offset: number
  mediaOrderBy: string
  orderDirection: Types.OrderDirection
  onlyFavorites?: boolean | null | undefined
}>

export type ShareAlbumQueryQuery = {
  album: {
    id: string
    title: string
    subAlbums: Array<{
      id: string
      title: string
      thumbnail: { id: string; thumbnail: { url: string } | null } | null
    }>
    media: Array<{
      id: string
      type: Types.MediaType
      blurhash: string | null
      favorite: boolean
      thumbnail: { url: string; width: number; height: number } | null
      highRes: { url: string } | null
      videoWeb: { url: string } | null
    }>
  }
}
