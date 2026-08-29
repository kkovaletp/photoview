/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../../__generated__/globalTypes'

export type SidebarGetPhotoSharesQueryVariables = Exact<{
  id: string | number
}>

export type SidebarGetPhotoSharesQuery = {
  __typename: 'Query'
  media: {
    __typename: 'Media'
    id: string
    shares: Array<{
      __typename: 'ShareToken'
      id: string
      token: string
      hasPassword: boolean
      expire: string | null
    }>
  }
}
