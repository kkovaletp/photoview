import * as Types from '../../../__generated__/globalTypes'

export type ResetAlbumCoverMutationVariables = Types.Exact<{
  albumID: Types.Scalars['ID']['input']
}>

export type ResetAlbumCoverMutation = {
  __typename?: 'Mutation'
  resetAlbumCover: {
    __typename?: 'Album'
    id: string
    thumbnail?: {
      __typename?: 'Media'
      id: string
      thumbnail?: { __typename?: 'MediaURL'; url: string } | null
    } | null
  }
}

export type SetAlbumCoverMutationVariables = Types.Exact<{
  coverID: Types.Scalars['ID']['input']
}>

export type SetAlbumCoverMutation = {
  __typename?: 'Mutation'
  setAlbumCover: {
    __typename?: 'Album'
    id: string
    thumbnail?: {
      __typename?: 'Media'
      id: string
      thumbnail?: { __typename?: 'MediaURL'; url: string } | null
    } | null
  }
}
