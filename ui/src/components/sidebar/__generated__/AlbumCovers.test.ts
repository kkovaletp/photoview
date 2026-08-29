/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type SetAlbumCoverMutationVariables = Exact<{
  coverID: string | number
}>

export type SetAlbumCoverMutation = {
  __typename: 'Mutation'
  setAlbumCover: {
    __typename: 'Album'
    id: string
    thumbnail: {
      __typename: 'Media'
      id: string
      thumbnail: { __typename: 'MediaURL'; url: string } | null
    } | null
  }
}

export type ResetAlbumCoverMutationVariables = Exact<{
  albumID: string | number
}>

export type ResetAlbumCoverMutation = {
  __typename: 'Mutation'
  resetAlbumCover: {
    __typename: 'Album'
    id: string
    thumbnail: {
      __typename: 'Media'
      id: string
      thumbnail: { __typename: 'MediaURL'; url: string } | null
    } | null
  }
}
