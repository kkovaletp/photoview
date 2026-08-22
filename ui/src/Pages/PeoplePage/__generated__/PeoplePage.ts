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
  myFaceGroups: Array<{
    id: string
    label: string | null
    imageFaceCount: number
    imageFaces: Array<{
      id: string
      rectangle: { minX: number; maxX: number; minY: number; maxY: number }
      media: {
        id: string
        title: string
        thumbnail: { url: string; width: number; height: number } | null
      }
    }>
  }>
}

export type SetGroupLabelMutationVariables = Exact<{
  groupID: string | number
  label?: string | null | undefined
}>

export type SetGroupLabelMutation = {
  setFaceGroupLabel: { id: string; label: string | null }
}

export type RecognizeUnlabeledFacesMutationVariables = Exact<{
  [key: string]: never
}>

export type RecognizeUnlabeledFacesMutation = {
  recognizeUnlabeledFaces: Array<{ id: string }>
}
