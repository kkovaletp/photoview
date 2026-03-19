import * as Types from '../../../__generated__/globalTypes'

export type PlacePageQueryMediaQueryVariables = Types.Exact<{
  mediaIDs: Array<Types.Scalars['ID']['input']> | Types.Scalars['ID']['input']
}>

export type PlacePageQueryMediaQuery = {
  __typename?: 'Query'
  mediaList: Array<{
    __typename?: 'Media'
    id: string
    type: Types.MediaType
    blurhash?: string | null
    favorite: boolean
    thumbnail?: {
      __typename?: 'MediaURL'
      url: string
      width: number
      height: number
    } | null
    highRes?: { __typename?: 'MediaURL'; url: string } | null
    videoWeb?: { __typename?: 'MediaURL'; url: string } | null
  }>
}
