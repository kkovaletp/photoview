import * as Types from '../../../__generated__/globalTypes'

export type SharePageTokenQueryVariables = Types.Exact<{
  token: Types.Scalars['String']['input']
  password?: Types.InputMaybe<Types.Scalars['String']['input']>
}>

export type SharePageTokenQuery = {
  __typename?: 'Query'
  shareToken: {
    __typename?: 'ShareToken'
    token: string
    album?: { __typename?: 'Album'; id: string } | null
    media?: {
      __typename?: 'Media'
      id: string
      title: string
      type: Types.MediaType
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
      videoWeb?: {
        __typename?: 'MediaURL'
        url: string
        width: number
        height: number
      } | null
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
          longitude: number
          latitude: number
        } | null
      } | null
    } | null
  }
}

export type ShareTokenValidatePasswordQueryVariables = Types.Exact<{
  token: Types.Scalars['String']['input']
  password?: Types.InputMaybe<Types.Scalars['String']['input']>
}>

export type ShareTokenValidatePasswordQuery = {
  __typename?: 'Query'
  shareTokenValidatePassword: boolean
}
