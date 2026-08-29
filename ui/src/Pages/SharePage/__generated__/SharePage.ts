/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type MediaType = 'Photo' | 'Video'

export type SharePageTokenQueryVariables = Exact<{
  token: string
  password?: string | null | undefined
}>

export type SharePageTokenQuery = {
  __typename: 'Query'
  shareToken: {
    __typename: 'ShareToken'
    token: string
    album: { __typename: 'Album'; id: string } | null
    media: {
      __typename: 'Media'
      id: string
      title: string
      type: Types.MediaType
      thumbnail: {
        __typename: 'MediaURL'
        url: string
        width: number
        height: number
      } | null
      downloads: Array<{
        __typename: 'MediaDownload'
        title: string
        mediaUrl: {
          __typename: 'MediaURL'
          url: string
          width: number
          height: number
          fileSize: number
        }
      }>
      highRes: {
        __typename: 'MediaURL'
        url: string
        width: number
        height: number
      } | null
      videoWeb: {
        __typename: 'MediaURL'
        url: string
        width: number
        height: number
      } | null
      exif: {
        __typename: 'MediaEXIF'
        id: string
        description: string | null
        camera: string | null
        maker: string | null
        lens: string | null
        dateShot: string | null
        exposure: number | null
        aperture: number | null
        iso: number | null
        focalLength: number | null
        flash: number | null
        exposureProgram: number | null
        coordinates: {
          __typename: 'Coordinates'
          longitude: number
          latitude: number
        } | null
      } | null
    } | null
  }
}

export type ShareTokenValidatePasswordQueryVariables = Exact<{
  token: string
  password?: string | null | undefined
}>

export type ShareTokenValidatePasswordQuery = {
  __typename: 'Query'
  shareTokenValidatePassword: boolean
}
