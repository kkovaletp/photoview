import { gql, useQuery } from '@apollo/client'
import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import PaginateLoader from '../../../components/PaginateLoader'
import MediaGallery from '../../../components/photoGallery/MediaGallery'
import { mediaGalleryReducer } from '../../../components/photoGallery/mediaGalleryReducer'
import useScrollPagination from '../../../hooks/useScrollPagination'
import FaceGroupTitle from './FaceGroupTitle'
import {
  SingleFaceGroupQuery,
  SingleFaceGroupQueryVariables,
} from './__generated__/SingleFaceGroup'
import { MediaGalleryFieldsFragment } from '../../../components/photoGallery/__generated__/MediaGallery'

export const SINGLE_FACE_GROUP = gql`
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
          id
          type
          title
          blurhash
          thumbnail {
            url
            width
            height
          }
          highRes {
            url
          }
          favorite
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
    //TODO: This forced cast tells the type checker to trust the gallery shape without proving it. If the shared gallery fragment changes later, this page can quietly drift out of sync and still compile. Prefer reusing the shared fragment in this query, or mapping through a small typed helper, instead of a blind cast.
    const media = (data?.faceGroup?.imageFaces?.map(x => ({
      ...x.media,
      videoWeb: null
    })) || []) as MediaGalleryFieldsFragment[]
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
