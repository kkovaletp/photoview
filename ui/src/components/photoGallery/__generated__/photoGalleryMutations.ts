import * as Types from '../../../__generated__/globalTypes'

export type MarkMediaFavoriteMutationVariables = Types.Exact<{
  mediaId: Types.Scalars['ID']['input']
  favorite: Types.Scalars['Boolean']['input']
}>

export type MarkMediaFavoriteMutation = {
  __typename?: 'Mutation'
  favoriteMedia: { __typename?: 'Media'; id: string; favorite: boolean }
}
