import * as Types from '../../../__generated__/globalTypes'

export type MapboxEnabledQueryQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type MapboxEnabledQueryQuery = {
  __typename?: 'Query'
  mapboxToken?: string | null
}

export type FaceDetectionEnabledQueryVariables = Types.Exact<{
  [key: string]: never
}>

export type FaceDetectionEnabledQuery = {
  __typename?: 'Query'
  siteInfo: { __typename?: 'SiteInfo'; faceDetectionEnabled: boolean }
}
