import * as Types from '../../../__generated__/globalTypes'

export type AlbumPathQueryQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
}>

export type AlbumPathQueryQuery = {
  __typename?: 'Query'
  album: {
    __typename?: 'Album'
    id: string
    path: Array<{ __typename?: 'Album'; id: string; title: string }>
  }
}
