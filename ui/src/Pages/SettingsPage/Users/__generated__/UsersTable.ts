/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../../__generated__/globalTypes'

export type SettingsUsersQueryQueryVariables = Exact<{ [key: string]: never }>

export type SettingsUsersQueryQuery = {
  __typename: 'Query'
  user: Array<{
    __typename: 'User'
    id: string
    username: string
    admin: boolean
    rootAlbums: Array<{ __typename: 'Album'; id: string; filePath: string }>
  }>
}
