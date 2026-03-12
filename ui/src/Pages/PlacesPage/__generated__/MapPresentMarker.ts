import * as Types from '../../../__generated__/globalTypes'

export type PlacePageQueryMediaQueryVariables = Types.Exact<{
  mediaIDs: Array<Types.Scalars['ID']['input']> | Types.Scalars['ID']['input']
}>

export type PlacePageQueryMediaQuery = {
  __typename?: 'Query'
  mediaList: Array<{
    __typename?: 'Media'
    id: string
    title: string
    blurhash?: string | null
    type: Types.MediaType
    thumbnail?: {
      __typename?: 'MediaURL'
      url: string
      width: number
      height: number
    } | null
    highRes?: {
      __typename?: 'MediaURL'
      url: string
      width: number
      height: number
    } | null
    videoWeb?: {
      __typename?: 'MediaURL'
      url: string
      width: number
      height: number
    } | null
  }>
}
