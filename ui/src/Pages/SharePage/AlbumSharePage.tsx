import Layout from '../../components/layout/Layout'
import styled from 'styled-components'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { useTranslation } from 'react-i18next'
import useURLParameters from '../../hooks/useURLParameters'
import useOrderingParams from '../../hooks/useOrderingParams'
import { ShareAlbumQueryQuery } from './__generated__/AlbumSharePage'
import AlbumGallery, { ALBUM_GALLERY_FRAGMENT } from '../../components/albumGallery/AlbumGallery'
import { MEDIA_GALLERY_FRAGMENT } from '../../components/photoGallery/fragments'
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

  const { containerElem, loadingMore } =
    useScrollPagination<ShareAlbumQueryQuery>({
      loading,
      // TODO: How to fix this type mismatch:
      /*
Type 'FetchMoreFunction<ShareAlbumQueryQuery, OperationVariables>' is not assignable to type '(args: { variables: { offset: number; }; }) => Promise<Result<ShareAlbumQueryQuery, "complete" | "empty" | "partial" | "streaming">>'.
  Type 'Promise<{ data: ShareAlbumQueryQuery; error?: undefined; }>' is not assignable to type 'Promise<Result<ShareAlbumQueryQuery, "complete" | "empty" | "partial" | "streaming">>'.
    Type '{ data: ShareAlbumQueryQuery; error?: undefined; }' is not assignable to type 'Result<ShareAlbumQueryQuery, "complete" | "empty" | "partial" | "streaming">'.
      Type '{ data: ShareAlbumQueryQuery; error?: undefined; }' is not assignable to type '({ error?: ErrorLike | undefined; loading: boolean; networkStatus: NetworkStatus; partial: boolean; } & { data: ShareAlbumQueryQuery; dataState: "complete"; }) | ({ ...; } & { ...; }) | ({ ...; } & { ...; })'.
        Type '{ data: ShareAlbumQueryQuery; error?: undefined; }' is not assignable to type '{ error?: ErrorLike | undefined; loading: boolean; networkStatus: NetworkStatus; partial: boolean; } & { data: DeepPartialObject<ShareAlbumQueryQuery>; dataState: "partial"; }'.
          Type '{ data: ShareAlbumQueryQuery; error?: undefined; }' is missing the following properties from type '{ error?: ErrorLike | undefined; loading: boolean; networkStatus: NetworkStatus; partial: boolean; }': loading, networkStatus, partial
useScrollPagination.ts(7, 3): The expected type comes from property 'fetchMore' which is declared here on type 'ScrollPaginationArgs<ShareAlbumQueryQuery>'
      */
      fetchMore,
      data,
      getItems: data => data.album.media,
      pageSize: 200,
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
          active={loadingMore}
          text={t('general.loading.paginate.media', 'Loading more media')}
        />
      </Layout>
    </AlbumSharePageWrapper>
  )
}

export default AlbumSharePage
