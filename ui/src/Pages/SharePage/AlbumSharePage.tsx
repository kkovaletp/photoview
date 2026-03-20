import Layout from '../../components/layout/Layout'
import styled from 'styled-components'
import { gql, useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import useURLParameters from '../../hooks/useURLParameters'
import useOrderingParams from '../../hooks/useOrderingParams'
import { ShareAlbumQueryQuery } from './__generated__/AlbumSharePage'
import AlbumGallery, { ALBUM_GALLERY_FRAGMENT } from '../../components/albumGallery/AlbumGallery'
import { MEDIA_GALLERY_FRAGMENT } from '../../components/photoGallery/MediaGallery'
import useScrollPagination from '../../hooks/useScrollPagination'
import PaginateLoader from '../../components/PaginateLoader'

export const SHARE_ALBUM_QUERY = gql`
  ${MEDIA_GALLERY_FRAGMENT}
  ${ALBUM_GALLERY_FRAGMENT}
  query shareAlbumQuery(
    $id: ID!
    $token: String!
    $password: String
    $limit: Int!
    $offset: Int!
    $mediaOrderBy: String!
    $orderDirection: OrderDirection!
    $onlyFavorites: Boolean
  ) {
    album(id: $id, tokenCredentials: { token: $token, password: $password }) {
      ...AlbumGalleryFields
    }
  }
`

const AlbumSharePageWrapper = styled.div`
  height: 100%;
`

type AlbumSharePageProps = {
  albumID: string
  token: string
  password: string | null
}

const AlbumSharePage = ({ albumID, token, password }: AlbumSharePageProps) => {
  const { t } = useTranslation()

  const urlParams = useURLParameters()
  const orderParams = useOrderingParams(urlParams)

  const { data, error, loading, fetchMore } = useQuery<ShareAlbumQueryQuery>(
    SHARE_ALBUM_QUERY,
    {
      variables: {
        id: albumID,
        token,
        password,
        limit: 200,
        offset: 0,
        mediaOrderBy: orderParams.orderBy,
        orderDirection: orderParams.orderDirection,
        onlyFavorites: false,
      },
    }
  )

  const { containerElem, finished: finishedLoadingMore } =
    useScrollPagination<ShareAlbumQueryQuery>({
      loading,
      fetchMore,
      data,
      getItems: data => data.album.media,
    })

  if (error) {
    return <div>{error.message}</div>
  }

  const album = data?.album

  return (
    <AlbumSharePageWrapper data-testid="AlbumSharePage">
      <Layout
        title={
          album ? album.title : t('general.loading.album', 'Loading album')
        }
      >
        <AlbumGallery
          ref={containerElem}
          album={album}
          customAlbumLink={albumId => `/share/${token}/${albumId}`}
          showFilter
          setOrdering={orderParams.setOrdering}
          ordering={orderParams}
        />
        <PaginateLoader
          active={!finishedLoadingMore && !loading}
          text={t('general.loading.paginate.media', 'Loading more media')}
        />
      </Layout>
    </AlbumSharePageWrapper>
  )
}

export default AlbumSharePage
