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
  __typename: 'Query'
  search: {
    __typename: 'SearchResult'
    query: string
    albums: Array<{
      __typename: 'Album'
      id: string
      title: string
      thumbnail: {
        __typename: 'Media'
        thumbnail: { __typename: 'MediaURL'; url: string } | null
      } | null
    }>
    media: Array<{
      __typename: 'Media'
      id: string
      title: string
      thumbnail: { __typename: 'MediaURL'; url: string } | null
      album: { __typename: 'Album'; id: string }
    }>
  }
}
