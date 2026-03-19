import * as Types from '../../../__generated__/globalTypes'

export type ShareAlbumQueryQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
  token: Types.Scalars['String']['input']
  password?: Types.InputMaybe<Types.Scalars['String']['input']>
  mediaOrderBy?: Types.InputMaybe<Types.Scalars['String']['input']>
  mediaOrderDirection?: Types.InputMaybe<Types.OrderDirection>
  limit?: Types.InputMaybe<Types.Scalars['Int']['input']>
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>
}>

export type ShareAlbumQueryQuery = {
  __typename?: 'Query'
  album: {
    __typename?: 'Album'
    id: string
    title: string
    subAlbums: Array<{
      __typename?: 'Album'
      id: string
      title: string
      thumbnail?: {
        __typename?: 'Media'
        id: string
        thumbnail?: {
          __typename?: 'MediaURL'
          url: string
          width: number
          height: number
        } | null
      } | null
    }>
    media: Array<{
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
}
