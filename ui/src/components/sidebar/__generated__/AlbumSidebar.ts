import * as Types from '../../../__generated__/globalTypes'

export type GetAlbumSidebarQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
}>

export type GetAlbumSidebarQuery = {
  __typename?: 'Query'
  album: { __typename?: 'Album'; id: string; title: string }
}
