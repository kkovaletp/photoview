import * as Types from '../../../__generated__/globalTypes'

export type AdminQueryQueryVariables = Types.Exact<{ [key: string]: never }>

export type AdminQueryQuery = {
  __typename?: 'Query'
  myUser: { __typename?: 'User'; admin: boolean }
}
