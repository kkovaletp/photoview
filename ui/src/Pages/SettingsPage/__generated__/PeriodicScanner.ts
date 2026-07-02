import * as Types from '../../../__generated__/globalTypes'

export type ScanIntervalQueryQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type ScanIntervalQueryQuery = {
  __typename?: 'Query'
  siteInfo: { __typename?: 'SiteInfo'; periodicScanInterval: number }
}

export type ChangeScanIntervalMutationMutationVariables = Types.Exact<{
  interval: Types.Scalars['Int']['input']
}>

export type ChangeScanIntervalMutationMutation = {
  __typename?: 'Mutation'
  setPeriodicScanInterval: number
}
