/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

export type SidebarDownloadQueryQueryVariables = Exact<{
  mediaId: string | number
}>

export type SidebarDownloadQueryQuery = {
  __typename: 'Query'
  media: {
    __typename: 'Media'
    id: string
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
  }
}
