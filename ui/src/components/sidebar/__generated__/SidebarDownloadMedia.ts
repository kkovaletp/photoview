import * as Types from '../../../__generated__/globalTypes'

export type SidebarDownloadQueryQueryVariables = Types.Exact<{
  mediaId: Types.Scalars['ID']['input']
}>

export type SidebarDownloadQueryQuery = {
  __typename?: 'Query'
  media: {
    __typename?: 'Media'
    id: string
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
  }
}
