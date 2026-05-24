import * as Types from '../../../../__generated__/globalTypes'

export type SidebarGetPhotoSharesQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
}>

export type SidebarGetPhotoSharesQuery = {
  __typename?: 'Query'
  media: {
    __typename?: 'Media'
    id: string
    shares: Array<{
      __typename?: 'ShareToken'
      id: string
      token: string
      hasPassword: boolean
      expire?: string | null
    }>
  }
}
