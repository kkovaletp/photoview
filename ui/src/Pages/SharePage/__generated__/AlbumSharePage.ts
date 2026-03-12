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
        thumbnail?: { __typename?: 'MediaURL'; url: string } | null
      } | null
    }>
    media: Array<{
      __typename?: 'Media'
      id: string
      title: string
      type: Types.MediaType
      blurhash?: string | null
      thumbnail?: {
        __typename?: 'MediaURL'
        url: string
        width: number
        height: number
      } | null
      downloads: Array<{
        __typename?: 'MediaDownload'
        title: string
        mediaUrl: {
          __typename?: 'MediaURL'
          url: string
          width: number
          height: number
          fileSize: number
        }
      }>
      highRes?: {
        __typename?: 'MediaURL'
        url: string
        width: number
        height: number
      } | null
      videoWeb?: { __typename?: 'MediaURL'; url: string } | null
      exif?: {
        __typename?: 'MediaEXIF'
        id: string
        description?: string | null
        camera?: string | null
        maker?: string | null
        lens?: string | null
        dateShot?: string | null
        exposure?: number | null
        aperture?: number | null
        iso?: number | null
        focalLength?: number | null
        flash?: number | null
        exposureProgram?: number | null
        coordinates?: {
          __typename?: 'Coordinates'
          latitude: number
          longitude: number
        } | null
      } | null
    }>
  }
}
