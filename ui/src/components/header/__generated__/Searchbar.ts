/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type SearchQueryQueryVariables = Exact<{
  query: string
}>

export type SearchQueryQuery = {
  search: {
    query: string
    albums: Array<{
      id: string
      title: string
      thumbnail: { thumbnail: { url: string } | null } | null
    }>
    media: Array<{
      id: string
      title: string
      thumbnail: { url: string } | null
      album: { id: string }
    }>
  }
}
