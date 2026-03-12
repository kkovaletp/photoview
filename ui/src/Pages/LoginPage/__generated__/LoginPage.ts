import * as Types from '../../../__generated__/globalTypes'

export type AuthorizeMutationVariables = Types.Exact<{
  username: Types.Scalars['String']['input']
  password: Types.Scalars['String']['input']
}>

export type AuthorizeMutation = {
  __typename?: 'Mutation'
  authorizeUser: {
    __typename?: 'AuthorizeResult'
    success: boolean
    status: string
    token?: string | null
  }
}
