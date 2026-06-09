import * as Types from '../../../__generated__/globalTypes'

export type EarliestMediaQueryVariables = Types.Exact<{ [key: string]: never }>

export type EarliestMediaQuery = {
  __typename?: 'Query'
  myMedia: Array<{ __typename?: 'Media'; id: string; date: string }>
}
