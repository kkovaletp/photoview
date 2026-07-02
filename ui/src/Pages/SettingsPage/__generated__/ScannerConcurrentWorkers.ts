import * as Types from '../../../__generated__/globalTypes'

export type ConcurrentWorkersQueryQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type ConcurrentWorkersQueryQuery = {
  __typename?: 'Query'
  siteInfo: { __typename?: 'SiteInfo'; concurrentWorkers: number }
}

export type SetConcurrentWorkersMutationVariables = Types.Exact<{
  workers: Types.Scalars['Int']['input']
}>

export type SetConcurrentWorkersMutation = {
  __typename?: 'Mutation'
  setScannerConcurrentWorkers: number
}
