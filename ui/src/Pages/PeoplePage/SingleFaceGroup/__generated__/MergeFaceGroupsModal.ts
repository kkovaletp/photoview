import * as Types from '../../../../__generated__/globalTypes'

export type CombineFacesMutationVariables = Types.Exact<{
  destID: Types.Scalars['ID']['input']
  srcIDs: Array<Types.Scalars['ID']['input']> | Types.Scalars['ID']['input']
}>

export type CombineFacesMutation = {
  __typename?: 'Mutation'
  combineFaceGroups: { __typename?: 'FaceGroup'; id: string }
}
