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

export type MyTimelineQueryVariables = Exact<{
  onlyFavorites?: boolean | null | undefined
  limit?: number | null | undefined
  offset?: number | null | undefined
  fromDate?: string | null | undefined
}>

export type MyTimelineQuery = {
  myTimeline: Array<{
    id: string
    title: string
    type: Types.MediaType
    blurhash: string | null
    favorite: boolean
    date: string
    thumbnail: { url: string; width: number; height: number } | null
    highRes: { url: string; width: number; height: number } | null
    videoWeb: { url: string } | null
    album: { id: string; title: string }
  }>
}
