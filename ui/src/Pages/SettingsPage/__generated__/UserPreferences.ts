import * as Types from '../../../__generated__/globalTypes'

export type ChangeUserPreferencesMutationVariables = Types.Exact<{
  language?: Types.InputMaybe<Types.Scalars['String']['input']>
}>

export type ChangeUserPreferencesMutation = {
  __typename?: 'Mutation'
  changeUserPreferences: {
    __typename?: 'UserPreferences'
    id: string
    language?: Types.LanguageTranslation | null
  }
}

export type MyUserPreferencesQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type MyUserPreferencesQuery = {
  __typename?: 'Query'
  myUserPreferences: {
    __typename?: 'UserPreferences'
    id: string
    language?: Types.LanguageTranslation | null
  }
}
