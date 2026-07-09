import * as Types from '../../../../__generated__/globalTypes'

export type UserRemoveAlbumPathMutationMutationVariables = Types.Exact<{
  userId: Types.Scalars['ID']['input']
  albumId: Types.Scalars['ID']['input']
}>

export type UserRemoveAlbumPathMutationMutation = {
  __typename?: 'Mutation'
  userRemoveRootAlbum?: { __typename?: 'Album'; id: string } | null
}
