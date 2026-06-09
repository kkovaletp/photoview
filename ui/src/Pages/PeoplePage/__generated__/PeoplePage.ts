import * as Types from '../../../__generated__/globalTypes'

export type MyFacesQueryVariables = Types.Exact<{
  limit?: Types.InputMaybe<Types.Scalars['Int']['input']>
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>
}>

export type MyFacesQuery = {
  __typename?: 'Query'
  myFaceGroups: Array<{
    __typename?: 'FaceGroup'
    id: string
    label?: string | null
    imageFaceCount: number
    imageFaces: Array<{
      __typename?: 'ImageFace'
      id: string
      rectangle: {
        __typename?: 'FaceRectangle'
        minX: number
        maxX: number
        minY: number
        maxY: number
      }
      media: {
        __typename?: 'Media'
        id: string
        title: string
        thumbnail?: {
          __typename?: 'MediaURL'
          url: string
          width: number
          height: number
        } | null
      }
    }>
  }>
}

export type SetGroupLabelMutationVariables = Types.Exact<{
  groupID: Types.Scalars['ID']['input']
  label?: Types.InputMaybe<Types.Scalars['String']['input']>
}>

export type SetGroupLabelMutation = {
  __typename?: 'Mutation'
  setFaceGroupLabel: {
    __typename?: 'FaceGroup'
    id: string
    label?: string | null
  }
}

export type RecognizeUnlabeledFacesMutationVariables = Types.Exact<{
  [key: string]: never
}>

export type RecognizeUnlabeledFacesMutation = {
  __typename?: 'Mutation'
  recognizeUnlabeledFaces: Array<{ __typename?: 'ImageFace'; id: string }>
}
