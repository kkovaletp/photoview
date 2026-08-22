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
  media: {
    id: string
    shares: Array<{
      id: string
      token: string
      hasPassword: boolean
      expire: string | null
    }>
  }
}

export type SidebarGetAlbumSharesQueryVariables = Exact<{
  id: string | number
}>

export type SidebarGetAlbumSharesQuery = {
  album: {
    id: string
    shares: Array<{
      id: string
      token: string
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

export type SidebarPhotoAddShareMutation = { shareMedia: { token: string } }

export type SidebarAlbumAddShareMutationVariables = Exact<{
  id: string | number
  password?: string | null | undefined
  expire?: string | null | undefined
}>

export type SidebarAlbumAddShareMutation = { shareAlbum: { token: string } }

export type SidebarProtectShareMutationVariables = Exact<{
  token: string
  password?: string | null | undefined
}>

export type SidebarProtectShareMutation = {
  protectShareToken: { token: string; hasPassword: boolean }
}

export type SidebarSetExpireShareMutationVariables = Exact<{
  token: string
  expire?: string | null | undefined
}>

export type SidebarSetExpireShareMutation = {
  setExpireShareToken: { token: string }
}

export type SidebareDeleteShareMutationVariables = Exact<{
  token: string
}>

export type SidebareDeleteShareMutation = {
  deleteShareToken: { token: string }
}
