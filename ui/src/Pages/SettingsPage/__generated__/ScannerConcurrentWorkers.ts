/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type ConcurrentWorkersQueryQueryVariables = Exact<{
  [key: string]: never
}>

export type ConcurrentWorkersQueryQuery = {
  __typename: 'Query'
  siteInfo: { __typename: 'SiteInfo'; concurrentWorkers: number }
}

export type SetConcurrentWorkersMutationVariables = Exact<{
  workers: number
}>

export type SetConcurrentWorkersMutation = {
  __typename: 'Mutation'
  setScannerConcurrentWorkers: number
}
