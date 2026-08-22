/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

/** Used to specify which order to sort items in */
export type OrderDirection =
  /** Sort accending A-Z */
  | 'ASC'
  /** Sort decending Z-A */
  | 'DESC'

export type GetMyAlbumsQueryVariables = Exact<{
  orderBy?: string | null | undefined
  orderDirection?: Types.OrderDirection | null | undefined
}>

export type GetMyAlbumsQuery = {
  myAlbums: Array<{
    id: string
    title: string
    thumbnail: { id: string; thumbnail: { url: string } | null } | null
  }>
}
