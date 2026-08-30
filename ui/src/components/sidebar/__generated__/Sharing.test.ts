/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
import * as Types from '../../../__generated__/globalTypes'

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
      label: string | null
      hasPassword: boolean
      expire: string | null
    }>
  }
}

export type SidebarGetAlbumSharesQueryVariables = Exact<{
  id: string | number
}>

export type SidebarGetAlbumSharesQuery = {
  __typename: 'Query'
  album: {
    __typename: 'Album'
    id: string
    shares: Array<{
      __typename: 'ShareToken'
      id: string
      token: string
      label: string | null
      hasPassword: boolean
      expire: string | null
    }>
  }
}

export type SidebarPhotoAddShareMutationVariables = Exact<{
  id: string | number
  password?: string | null | undefined
  expire?: string | null | undefined
}>

export type SidebarPhotoAddShareMutation = {
  __typename: 'Mutation'
  shareMedia: { __typename: 'ShareToken'; token: string }
}

export type SidebarAlbumAddShareMutationVariables = Exact<{
  id: string | number
  password?: string | null | undefined
  expire?: string | null | undefined
}>

export type SidebarAlbumAddShareMutation = {
  __typename: 'Mutation'
  shareAlbum: { __typename: 'ShareToken'; token: string }
}

export type SidebarProtectShareMutationVariables = Exact<{
  token: string
  password?: string | null | undefined
}>

export type SidebarProtectShareMutation = {
  __typename: 'Mutation'
  protectShareToken: {
    __typename: 'ShareToken'
    token: string
    hasPassword: boolean
  }
}

export type SidebareDeleteShareMutationVariables = Exact<{
  token: string
}>

export type SidebareDeleteShareMutation = {
  __typename: 'Mutation'
  deleteShareToken: { __typename: 'ShareToken'; token: string }
}
