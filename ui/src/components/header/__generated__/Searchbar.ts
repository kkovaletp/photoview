import * as Types from '../../../__generated__/globalTypes'

export type SearchQueryQueryVariables = Types.Exact<{
  query: Types.Scalars['String']['input']
}>

export type SearchQueryQuery = {
  __typename?: 'Query'
  search: {
    __typename?: 'SearchResult'
    query: string
    albums: Array<{
      __typename?: 'Album'
      id: string
      title: string
      thumbnail?: {
        __typename?: 'Media'
        thumbnail?: { __typename?: 'MediaURL'; url: string } | null
      } | null
    }>
    media: Array<{
      __typename?: 'Media'
      id: string
      title: string
      thumbnail?: { __typename?: 'MediaURL'; url: string } | null
      album: { __typename?: 'Album'; id: string }
    }>
  }
}
