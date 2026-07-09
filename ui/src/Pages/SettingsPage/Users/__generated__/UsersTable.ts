import * as Types from '../../../../__generated__/globalTypes'

export type SettingsUsersQueryQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type SettingsUsersQueryQuery = {
  __typename?: 'Query'
  user: Array<{
    __typename?: 'User'
    id: string
    username: string
    admin: boolean
    rootAlbums: Array<{ __typename?: 'Album'; id: string; filePath: string }>
  }>
}
