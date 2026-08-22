/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

/** Supported language translations of the user interface */
export type LanguageTranslation =
  | 'Basque'
  | 'Danish'
  | 'Dutch'
  | 'English'
  | 'French'
  | 'German'
  | 'Italian'
  | 'Japanese'
  | 'Polish'
  | 'Portuguese'
  | 'Russian'
  | 'SimplifiedChinese'
  | 'Spanish'
  | 'Swedish'
  | 'TraditionalChineseHK'
  | 'TraditionalChineseTW'
  | 'Turkish'
  | 'Ukrainian'

export type ChangeUserPreferencesMutationVariables = Exact<{
  language?: string | null | undefined
}>

export type ChangeUserPreferencesMutation = {
  changeUserPreferences: {
    id: string
    language: Types.LanguageTranslation | null
  }
}

export type MyUserPreferencesQueryVariables = Exact<{ [key: string]: never }>

export type MyUserPreferencesQuery = {
  myUserPreferences: { id: string; language: Types.LanguageTranslation | null }
}
