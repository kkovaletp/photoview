import * as Types from '../../../__generated__/globalTypes'

export type AlbumGalleryFieldsFragment = {
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
