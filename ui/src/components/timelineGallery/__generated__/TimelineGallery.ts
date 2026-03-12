import * as Types from '../../../__generated__/globalTypes'

export type MyTimelineQueryVariables = Types.Exact<{
  onlyFavorites?: Types.InputMaybe<Types.Scalars['Boolean']['input']>
  limit?: Types.InputMaybe<Types.Scalars['Int']['input']>
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>
  fromDate?: Types.InputMaybe<Types.Scalars['Time']['input']>
}>

export type MyTimelineQuery = {
  __typename?: 'Query'
  myTimeline: Array<{
    __typename?: 'Media'
    id: string
    title: string
    type: Types.MediaType
    blurhash?: string | null
    favorite: boolean
    date: any
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
    videoWeb?: { __typename?: 'MediaURL'; url: string } | null
    album: { __typename?: 'Album'; id: string; title: string }
  }>
}
