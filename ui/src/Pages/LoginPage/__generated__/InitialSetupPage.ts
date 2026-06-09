import * as Types from '../../../__generated__/globalTypes'

export type InitialSetupMutationVariables = Types.Exact<{
  username: Types.Scalars['String']['input']
  password: Types.Scalars['String']['input']
  rootPath: Types.Scalars['String']['input']
}>

export type InitialSetupMutation = {
  __typename?: 'Mutation'
  initialSetupWizard?: {
    __typename?: 'AuthorizeResult'
    success: boolean
    status: string
    token?: string | null
  } | null
}
