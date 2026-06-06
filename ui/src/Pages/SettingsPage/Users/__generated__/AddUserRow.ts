import * as Types from '../../../../__generated__/globalTypes'

export type CreateUserMutationVariables = Types.Exact<{
  username: Types.Scalars['String']['input']
  admin: Types.Scalars['Boolean']['input']
  rootPath?: Types.InputMaybe<Types.Scalars['String']['input']>
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
