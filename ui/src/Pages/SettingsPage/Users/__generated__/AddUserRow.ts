import * as Types from '../../../../__generated__/globalTypes'

export type CreateUserMutationVariables = Types.Exact<{
  username: Types.Scalars['String']['input']
  admin: Types.Scalars['Boolean']['input']
}>

export type CreateUserMutation = {
  __typename?: 'Mutation'
  createUser: {
    __typename: 'User'
    id: string
    username: string
    admin: boolean
  }
}

export type UserAddRootPathMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
  rootPath: Types.Scalars['String']['input']
}>

export type UserAddRootPathMutation = {
  __typename?: 'Mutation'
  userAddRootPath?: { __typename?: 'Album'; id: string } | null
}
