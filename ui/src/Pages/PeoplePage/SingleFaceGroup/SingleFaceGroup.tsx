import { gql, useQuery } from '@apollo/client'
import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import PaginateLoader from '../../../components/PaginateLoader'
import MediaGallery, {
  MEDIA_GALLERY_FRAGMENT,
} from '../../../components/photoGallery/MediaGallery'
import { mediaGalleryReducer } from '../../../components/photoGallery/mediaGalleryReducer'
import useScrollPagination from '../../../hooks/useScrollPagination'
import FaceGroupTitle from './FaceGroupTitle'
import {
  SingleFaceGroupQuery,
  SingleFaceGroupQueryVariables,
} from './__generated__/SingleFaceGroup'

export const SINGLE_FACE_GROUP = gql`
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

type SingleFaceGroupProps = {
  faceGroupID: string
}

const SingleFaceGroup = ({ faceGroupID }: SingleFaceGroupProps) => {
  const { t } = useTranslation()

  const { data, error, loading, fetchMore } = useQuery<
    SingleFaceGroupQuery,
    SingleFaceGroupQueryVariables
  >(SINGLE_FACE_GROUP, {
    variables: {
      limit: 200,
      offset: 0,
      id: faceGroupID,
    },
  })

  const [mediaState, dispatchMedia] = useReducer(mediaGalleryReducer, {
    presenting: false,
    activeIndex: -1,
    media: [],
  })

  const { containerElem, finished: finishedLoadingMore } =
    useScrollPagination<SingleFaceGroupQuery>({
      loading,
      fetchMore,
      data,
      getItems: data => data.faceGroup?.imageFaces ?? [],
    })

  useEffect(() => {
    const media = data?.faceGroup?.imageFaces?.map(x => x.media) ?? []
    dispatchMedia({ type: 'replaceMedia', media })
  }, [data])

  const faceGroup = data?.faceGroup

  if (error) {
    return <div>{error.message}</div>
  }

  if (data && !data.faceGroup) {
    return <div>{t('general.notFound', 'Face group not found')}</div>
  }

  return (
    <div ref={containerElem}>
      <FaceGroupTitle faceGroup={faceGroup} />
      <div>
        <MediaGallery
          loading={loading}
          dispatchMedia={dispatchMedia}
          mediaState={mediaState}
        />
        <PaginateLoader
          active={!finishedLoadingMore && !loading}
          text={t('general.loading.paginate.media', 'Loading more media')}
        />
      </div>
    </div>
  )
}

export default SingleFaceGroup
