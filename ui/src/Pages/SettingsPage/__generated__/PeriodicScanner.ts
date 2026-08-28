/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type ScanIntervalQueryQueryVariables = Exact<{ [key: string]: never }>

export type ScanIntervalQueryQuery = {
  __typename: 'Query'
  siteInfo: { __typename: 'SiteInfo'; periodicScanInterval: number }
}

export type ChangeScanIntervalMutationMutationVariables = Exact<{
  interval: number
}>

export type ChangeScanIntervalMutationMutation = {
  __typename: 'Mutation'
  setPeriodicScanInterval: number
}
