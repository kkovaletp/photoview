import * as Types from '../../../../__generated__/globalTypes'

export type MoveImageFacesMutationVariables = Types.Exact<{
  faceIDs: Array<Types.Scalars['ID']['input']> | Types.Scalars['ID']['input']
  destFaceGroupID: Types.Scalars['ID']['input']
}>

export type MoveImageFacesMutation = {
  __typename?: 'Mutation'
  moveImageFaces: { __typename?: 'FaceGroup'; id: string }
}
