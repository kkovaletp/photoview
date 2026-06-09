import * as Types from '../../../__generated__/globalTypes'

export type GetMyAlbumsQueryVariables = Types.Exact<{
  orderBy?: Types.InputMaybe<Types.Scalars['String']['input']>
  orderDirection?: Types.InputMaybe<Types.OrderDirection>
}>

export type GetMyAlbumsQuery = {
  __typename?: 'Query'
  myAlbums: Array<{
    __typename?: 'Album'
    id: string
    title: string
    thumbnail?: {
      __typename?: 'Media'
      id: string
      thumbnail?: { __typename?: 'MediaURL'; url: string } | null
    } | null
  }>
}
