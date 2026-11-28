import * as Types from '../../../../__generated__/globalTypes'

/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
export type UserRemoveAlbumPathMutationMutationVariables = Exact<{
  userId: string | number
  albumId: string | number
}>

export type UserRemoveAlbumPathMutationMutation = {
  __typename: 'Mutation'
  userRemoveRootAlbum: { __typename: 'Album'; id: string } | null
}
