import * as Types from '../../../../__generated__/globalTypes'

export type ChangeUserPasswordMutationVariables = Types.Exact<{
  userId: Types.Scalars['ID']['input']
  password: Types.Scalars['String']['input']
}>

export type ChangeUserPasswordMutation = {
  __typename?: 'Mutation'
  updateUser: { __typename?: 'User'; id: string }
}
