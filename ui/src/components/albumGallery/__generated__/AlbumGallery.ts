/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type MediaType = 'Photo' | 'Video'

export type AlbumGalleryFieldsFragment = {
  id: string
  title: string
  subAlbums: Array<{
    id: string
    title: string
    thumbnail: { id: string; thumbnail: { url: string } | null } | null
  }>
  media: Array<{
    id: string
    type: Types.MediaType
    blurhash: string | null
    favorite: boolean
    thumbnail: { url: string; width: number; height: number } | null
    highRes: { url: string } | null
    videoWeb: { url: string } | null
  }>
}
