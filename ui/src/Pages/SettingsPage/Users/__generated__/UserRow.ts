/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../../__generated__/globalTypes'

export type UpdateUserMutationVariables = Exact<{
  id: string | number
  username?: string | null | undefined
  admin?: boolean | null | undefined
}>

export type UpdateUserMutation = {
  __typename: 'Mutation'
  updateUser: {
    __typename: 'User'
    id: string
    username: string
    admin: boolean
  }
}

export type DeleteUserMutationVariables = Exact<{
  id: string | number
}>

export type DeleteUserMutation = {
  __typename: 'Mutation'
  deleteUser: { __typename: 'User'; id: string; username: string }
}

export type ScanUserMutationVariables = Exact<{
  userId: string | number
}>

export type ScanUserMutation = {
  __typename: 'Mutation'
  scanUser: { __typename: 'ScannerResult'; success: boolean }
}
