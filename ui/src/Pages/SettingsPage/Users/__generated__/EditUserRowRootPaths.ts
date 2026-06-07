import * as Types from '../../../../__generated__/globalTypes'

export type UserRemoveAlbumPathMutationMutationVariables = Types.Exact<{
  userId: Types.Scalars['ID']['input']
  albumId: Types.Scalars['ID']['input']
}>

export type UserRemoveAlbumPathMutationMutation = {
  __typename?: 'Mutation'
  userRemoveRootAlbum?: { __typename?: 'Album'; id: string } | null
}

export type UserAddRootPathMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
  rootPath: Types.Scalars['String']['input']
}>

export type UserAddRootPathMutation = {
  __typename?: 'Mutation'
  userAddRootPath?: { __typename?: 'Album'; id: string } | null
}
