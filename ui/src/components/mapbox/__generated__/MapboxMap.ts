import * as Types from '../../../__generated__/globalTypes'

export type MapboxTokenQueryVariables = Types.Exact<{ [key: string]: never }>

export type MapboxTokenQuery = {
  __typename?: 'Query'
  mapboxToken?: string | null
  myMediaGeoJson: any
}
