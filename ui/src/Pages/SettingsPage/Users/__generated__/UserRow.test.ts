import * as Types from '../../../../__generated__/globalTypes'

export type UpdateUserMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
  username?: Types.InputMaybe<Types.Scalars['String']['input']>
  admin?: Types.InputMaybe<Types.Scalars['Boolean']['input']>
}>

export type UpdateUserMutation = {
  __typename?: 'Mutation'
  updateUser: {
    __typename?: 'User'
    id: string
    username: string
    admin: boolean
  }
}

export type DeleteUserMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
}>

export type DeleteUserMutation = {
  __typename?: 'Mutation'
  deleteUser: { __typename?: 'User'; id: string; username: string }
}

export type ScanUserMutationVariables = Types.Exact<{
  userId: Types.Scalars['ID']['input']
}>

export type ScanUserMutation = {
  __typename?: 'Mutation'
  scanUser: { __typename?: 'ScannerResult'; success: boolean }
}
