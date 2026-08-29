/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../../__generated__/globalTypes'

export type UserRemoveAlbumPathMutationMutationVariables = Exact<{
  userId: string | number
  albumId: string | number
}>

export type UserRemoveAlbumPathMutationMutation = {
  __typename: 'Mutation'
  userRemoveRootAlbum: { __typename: 'Album'; id: string } | null
}

export type UserAddRootPathMutationVariables = Exact<{
  id: string | number
  rootPath: string
}>

export type UserAddRootPathMutation = {
  __typename: 'Mutation'
  userAddRootPath: { __typename: 'Album'; id: string } | null
}
