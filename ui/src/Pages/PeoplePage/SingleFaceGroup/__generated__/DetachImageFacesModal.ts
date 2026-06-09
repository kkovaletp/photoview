import * as Types from '../../../../__generated__/globalTypes'

export type DetachImageFacesMutationVariables = Types.Exact<{
  faceIDs: Array<Types.Scalars['ID']['input']> | Types.Scalars['ID']['input']
}>

export type DetachImageFacesMutation = {
  __typename?: 'Mutation'
  detachImageFaces: {
    __typename?: 'FaceGroup'
    id: string
    label?: string | null
  }
}
