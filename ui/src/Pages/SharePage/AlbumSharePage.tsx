import Layout from '../../components/layout/Layout'
import AlbumGallery from '../../components/albumGallery/AlbumGallery'
import styled from 'styled-components'
import { gql, useQuery } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import useURLParameters from '../../hooks/useURLParameters'
import useOrderingParams from '../../hooks/useOrderingParams'
import { ShareAlbumQueryQuery } from './__generated__/AlbumSharePage'
import useScrollPagination from '../../hooks/useScrollPagination'
import PaginateLoader from '../../components/PaginateLoader'

export const SHARE_ALBUM_QUERY = gql`
  query shareAlbumQuery(
    $id: ID!
    $token: String!
    $password: String
    $mediaOrderBy: String
    $mediaOrderDirection: OrderDirection
    $limit: Int
    $offset: Int
  ) {
    album(id: $id, tokenCredentials: { token: $token, password: $password }) {
      id
      title
      subAlbums(order: { order_by: "title" }) {
        id
        title
        thumbnail {
          id
          thumbnail {
            url
          }
        }
      }
      media(
        paginate: { limit: $limit, offset: $offset }
        order: {
          order_by: $mediaOrderBy
          order_direction: $mediaOrderDirection
        }
      ) {
        id
        title
        type
        blurhash
        favorite
        thumbnail {
          url
          width
          height
        }
        downloads {
          title
          mediaUrl {
            url
            width
            height
            fileSize
          }
        }
        highRes {
          url
          width
          height
        }
        videoWeb {
          url
        }
        exif {
          id
          description
          camera
          maker
          lens
          dateShot
          exposure
          aperture
          iso
          focalLength
          flash
          exposureProgram
          coordinates {
            latitude
            longitude
          }
        }
      }
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
        mediaOrderDirection: orderParams.orderDirection,
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
    //TODO: how to fix the following type mismatch: "Type '{ __typename?: "Album" | undefined; id: string; title: string; subAlbums: { __typename?: "Album" | undefined; id: string; title: string; thumbnail?: { __typename?: "Media" | undefined; id: string; thumbnail?: { ...; } | ... 1 more ... | undefined; } | null | undefined; }[]; media: { ...; }[]; } | undefined' is not assignable to type 'AlbumGalleryFieldsFragment | undefined'.
    // Type '{ __typename?: "Album" | undefined; id: string; title: string; subAlbums: { __typename?: "Album" | undefined; id: string; title: string; thumbnail?: { __typename?: "Media" | undefined; id: string; thumbnail?: { ...; } | ... 1 more ... | undefined; } | null | undefined; }[]; media: { ...; }[]; }' is not assignable to type 'AlbumGalleryFieldsFragment'.
    // Types of property 'media' are incompatible.
    // Type '{ __typename?: "Media" | undefined; id: string; title: string; type: MediaType; blurhash?: string | null | undefined; thumbnail?: { __typename?: "MediaURL" | undefined; url: string; width: number; height: number; } | null | undefined; downloads: { ...; }[]; highRes?: { ...; } | ... 1 more ... | undefined; videoWeb?:...' is not assignable to type '{ __typename?: "Media" | undefined; id: string; type: MediaType; blurhash?: string | null | undefined; favorite: boolean; thumbnail?: { __typename?: "MediaURL" | undefined; url: string; width: number; height: number; } | null | undefined; highRes?: { ...; } | ... 1 more ... | undefined; videoWeb?: { ...; } | ... 1 m...'.
    //   Property 'favorite' is missing in type '{ __typename?: "Media" | undefined; id: string; title: string; type: MediaType; blurhash?: string | null | undefined; thumbnail?: { __typename?: "MediaURL" | undefined; url: string; width: number; height: number; } | null | undefined; downloads: { ...; }[]; highRes?: { ...; } | ... 1 more ... | undefined; videoWeb?:...' but required in type '{ __typename?: "Media" | undefined; id: string; type: MediaType; blurhash?: string | null | undefined; favorite: boolean; thumbnail?: { __typename?: "MediaURL" | undefined; url: string; width: number; height: number; } | null | undefined; highRes?: { ...; } | ... 1 more ... | undefined; videoWeb?: { ...; } | ... 1 m...'."
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
