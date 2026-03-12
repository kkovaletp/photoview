import * as Types from './globalTypes'

export type SiteTranslationQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type SiteTranslationQuery = {
  __typename?: 'Query'
  myUserPreferences: {
    __typename?: 'UserPreferences'
    id: string
    language?: Types.LanguageTranslation | null
  }
}
