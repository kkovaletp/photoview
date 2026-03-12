import * as Types from '../../../__generated__/globalTypes'

export type ScanAllMutationMutationVariables = Types.Exact<{
  [key: string]: never
}>

export type ScanAllMutationMutation = {
  __typename?: 'Mutation'
  scanAll: {
    __typename?: 'ScannerResult'
    success: boolean
    message?: string | null
  }
}
