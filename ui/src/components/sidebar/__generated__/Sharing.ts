import * as Types from '../../../__generated__/globalTypes'

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
      expire?: any | null
    }>
  }
}

export type SidebarGetAlbumSharesQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
}>

export type SidebarGetAlbumSharesQuery = {
  __typename?: 'Query'
  album: {
    __typename?: 'Album'
    id: string
    shares: Array<{
      __typename?: 'ShareToken'
      id: string
      token: string
      hasPassword: boolean
      expire?: any | null
    }>
  }
}

export type SidebarPhotoAddShareMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
  password?: Types.InputMaybe<Types.Scalars['String']['input']>
  expire?: Types.InputMaybe<Types.Scalars['Time']['input']>
}>

export type SidebarPhotoAddShareMutation = {
  __typename?: 'Mutation'
  shareMedia: { __typename?: 'ShareToken'; token: string }
}

export type SidebarAlbumAddShareMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
  password?: Types.InputMaybe<Types.Scalars['String']['input']>
  expire?: Types.InputMaybe<Types.Scalars['Time']['input']>
}>

export type SidebarAlbumAddShareMutation = {
  __typename?: 'Mutation'
  shareAlbum: { __typename?: 'ShareToken'; token: string }
}

export type SidebarProtectShareMutationVariables = Types.Exact<{
  token: Types.Scalars['String']['input']
  password?: Types.InputMaybe<Types.Scalars['String']['input']>
}>

export type SidebarProtectShareMutation = {
  __typename?: 'Mutation'
  protectShareToken: {
    __typename?: 'ShareToken'
    token: string
    hasPassword: boolean
  }
}

export type SidebarSetExpireShareMutationVariables = Types.Exact<{
  token: Types.Scalars['String']['input']
  expire?: Types.InputMaybe<Types.Scalars['Time']['input']>
}>

export type SidebarSetExpireShareMutation = {
  __typename?: 'Mutation'
  setExpireShareToken: { __typename?: 'ShareToken'; token: string }
}

export type SidebareDeleteShareMutationVariables = Types.Exact<{
  token: Types.Scalars['String']['input']
}>

export type SidebareDeleteShareMutation = {
  __typename?: 'Mutation'
  deleteShareToken: { __typename?: 'ShareToken'; token: string }
}
