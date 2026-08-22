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
  setAlbumCover: {
    id: string
    thumbnail: { id: string; thumbnail: { url: string } | null } | null
  }
}

export type ResetAlbumCoverMutationVariables = Exact<{
  albumID: string | number
}>

export type ResetAlbumCoverMutation = {
  resetAlbumCover: {
    id: string
    thumbnail: { id: string; thumbnail: { url: string } | null } | null
  }
}
