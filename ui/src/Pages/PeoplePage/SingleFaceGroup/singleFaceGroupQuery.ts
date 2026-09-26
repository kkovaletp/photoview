import { gql, type TypedDocumentNode } from '@apollo/client'
import { MEDIA_GALLERY_FRAGMENT } from '../../../components/photoGallery/fragments'
import {
  SingleFaceGroupQuery,
  SingleFaceGroupQueryVariables,
} from './__generated__/singleFaceGroupQuery'

export const SINGLE_FACE_GROUP: TypedDocumentNode<
  SingleFaceGroupQuery,
  SingleFaceGroupQueryVariables
> = gql`
    ${MEDIA_GALLERY_FRAGMENT}

    query singleFaceGroup($id: ID!, $limit: Int!, $offset: Int!) {
        faceGroup(id: $id) {
            id
            label
            imageFaces(paginate: { limit: $limit, offset: $offset }) {
                id
                rectangle {
                    minX
                    maxX
                    minY
                    maxY
                }
                media {
                    ...MediaGalleryFields
                    title
                }
            }
        }
    }
`
