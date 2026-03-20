import * as Types from '../../../../__generated__/globalTypes'

export type SingleFaceGroupQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input']
  limit: Types.Scalars['Int']['input']
  offset: Types.Scalars['Int']['input']
}>

export type SingleFaceGroupQuery = {
  __typename?: 'Query'
  faceGroup: {
    __typename?: 'FaceGroup'
    id: string
    label?: string | null
    imageFaces: Array<{
      __typename?: 'ImageFace'
      id: string
      rectangle: {
        __typename?: 'FaceRectangle'
        minX: number
        maxX: number
        minY: number
        maxY: number
      }
      media: {
        __typename?: 'Media'
        title: string
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
      }
    }>
  }
}
