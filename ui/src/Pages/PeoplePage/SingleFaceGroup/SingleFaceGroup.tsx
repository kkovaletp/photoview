import { useQuery } from '@apollo/client/react'
import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import PaginateLoader from '../../../components/PaginateLoader'
import MediaGallery from '../../../components/photoGallery/MediaGallery'
import { mediaGalleryReducer } from '../../../components/photoGallery/mediaGalleryReducer'
import useScrollPagination from '../../../hooks/useScrollPagination'
import FaceGroupTitle from './FaceGroupTitle'
import { SINGLE_FACE_GROUP } from './singleFaceGroupQuery'
import {
  SingleFaceGroupQuery,
  SingleFaceGroupQueryVariables,
} from './__generated__/singleFaceGroupQuery'

type SingleFaceGroupProps = {
  faceGroupID: string
}

const SingleFaceGroup = ({ faceGroupID }: SingleFaceGroupProps) => {
  const { t } = useTranslation()

  //TODO: Replace deprecated `useQuery`:
  /*
              * @deprecated Avoid manually specifying generics on `useQuery`.
              * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your query results.
              */
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

  const { containerElem, loadingMore } =
    useScrollPagination<SingleFaceGroupQuery>({
      loading,
      fetchMore,
      data,
      getItems: data => data.faceGroup?.imageFaces ?? [],
      pageSize: 200,
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
          active={loadingMore}
          text={t('general.loading.paginate.media', 'Loading more media')}
        />
      </div>
    </div>
  )
}

export default SingleFaceGroup
