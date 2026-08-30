/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type MyFacesQueryVariables = Exact<{
  limit?: number | null | undefined
  offset?: number | null | undefined
}>

export type MyFacesQuery = {
  __typename: 'Query'
  myFaceGroups: Array<{
    __typename: 'FaceGroup'
    id: string
    label: string | null
    imageFaceCount: number
    imageFaces: Array<{
      __typename: 'ImageFace'
      id: string
      rectangle: {
        __typename: 'FaceRectangle'
        minX: number
        maxX: number
        minY: number
        maxY: number
      }
      media: {
        __typename: 'Media'
        id: string
        title: string
        thumbnail: {
          __typename: 'MediaURL'
          url: string
          width: number
          height: number
        } | null
      }
    }>
  }>
}

export type SetGroupLabelMutationVariables = Exact<{
  groupID: string | number
  label?: string | null | undefined
}>

export type SetGroupLabelMutation = {
  __typename: 'Mutation'
  setFaceGroupLabel: {
    __typename: 'FaceGroup'
    id: string
    label: string | null
  }
}

export type RecognizeUnlabeledFacesMutationVariables = Exact<{
  [key: string]: never
}>

export type RecognizeUnlabeledFacesMutation = {
  __typename: 'Mutation'
  recognizeUnlabeledFaces: Array<{ __typename: 'ImageFace'; id: string }>
}
