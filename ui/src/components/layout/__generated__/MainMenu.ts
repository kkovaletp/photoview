/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type MapboxEnabledQueryQueryVariables = Exact<{ [key: string]: never }>

export type MapboxEnabledQueryQuery = {
  __typename: 'Query'
  mapboxToken: string | null
}

export type FaceDetectionEnabledQueryVariables = Exact<{ [key: string]: never }>

export type FaceDetectionEnabledQuery = {
  __typename: 'Query'
  siteInfo: { __typename: 'SiteInfo'; faceDetectionEnabled: boolean }
}
