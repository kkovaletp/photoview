import * as Types from '../../../__generated__/globalTypes'

export type CheckInitialSetupQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type CheckInitialSetupQuery = {
  __typename?: 'Query'
  siteInfo: { __typename?: 'SiteInfo'; initialSetup: boolean }
}
