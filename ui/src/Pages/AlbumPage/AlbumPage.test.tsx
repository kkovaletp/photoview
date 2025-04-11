import { screen, waitFor } from '@testing-library/react'
import AlbumPage from './AlbumPage'
import { renderWithProviders } from '../../helpers/testUtils'
import { gql } from '@apollo/client'
import { OrderDirection } from '../../__generated__/globalTypes'

vi.mock('../../hooks/useScrollPagination', () => {
  return {
    default: () => ({
      containerElem: { current: null },
      finished: false
    })
  }
})

// Define the album query based on the actual implementation
const ALBUM_QUERY = gql`
  fragment MediaGalleryFields on Media {
    id
    type
    blurhash
    thumbnail {
      url
      width
      height
    }
    highRes {
      url
    }
    videoWeb {
      url
    }
    favorite
  }

  fragment AlbumGalleryFields on Album {
    id
    title
    subAlbums(order: {order_by: "title", order_direction: $orderDirection}) {
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
      paginate: {limit: $limit, offset: $offset}
      order: {order_by: $mediaOrderBy, order_direction: $orderDirection}
      onlyFavorites: $onlyFavorites
    ) {
      ...MediaGalleryFields
    }
  }

  query albumQuery($id: ID!, $onlyFavorites: Boolean, $mediaOrderBy: String, $orderDirection: OrderDirection, $limit: Int, $offset: Int) {
    album(id: $id) {
      ...AlbumGalleryFields
    }
  }
`;

// Create a mock with the expected structure
const mockAlbumQuery = {
  request: {
    query: ALBUM_QUERY,
    variables: {
      id: "1",
      onlyFavorites: false,
      mediaOrderBy: "date_shot",
      orderDirection: OrderDirection.ASC,
      offset: 0,
      limit: 200
    }
  },
  result: {
    data: {
      album: {
        id: "1",
        title: "Test Album",
        subAlbums: [],
        media: []
      }
    }
  }
};

test('AlbumPage renders', () => {
  renderWithProviders(

    <AlbumPage />

    , {
      mocks: [mockAlbumQuery],
      initialEntries: ['/album/1'],
      path: "/album/:id",
      route:

        <AlbumPage />

    })

  expect(screen.getByText('Sort')).toBeInTheDocument()
  expect(screen.getByLabelText('Sort direction')).toBeInTheDocument()
})

test('AlbumPage shows loading state', () => {
  renderWithProviders(

    <AlbumPage />

    , {
      mocks: [],
      initialEntries: ['/album/1'],
      path: "/album/:id",
      route:

        <AlbumPage />

    })

  expect(screen.getByText('Loading...')).toBeInTheDocument()
})

test('AlbumPage shows error state', async () => {
  const errorMock = {
    request: {
      query: ALBUM_QUERY,
      variables: {
        id: "1",
        onlyFavorites: false,
        mediaOrderBy: "date_shot",
        orderDirection: OrderDirection.ASC,
        offset: 0,
        limit: 200
      }
    },
    error: new Error('Test error message')
  };

  renderWithProviders(

    <AlbumPage />

    , {
      mocks: [errorMock],
      initialEntries: ['/album/1'],
      path: "/album/:id",
      route:

        <AlbumPage />

    })

  await waitFor(() => {
    expect(screen.getByText(/Error:/)).toBeInTheDocument()
  })
})

test('AlbumPage shows not found state', async () => {
  const notFoundMock = {
    request: {
      query: ALBUM_QUERY,
      variables: {
        id: "1",
        onlyFavorites: false,
        mediaOrderBy: "date_shot",
        orderDirection: OrderDirection.ASC,
        offset: 0,
        limit: 200
      }
    },
    result: {
      data: {
        album: null
      }
    }
  };

  renderWithProviders(

    <AlbumPage />

    , {
      mocks: [notFoundMock],
      initialEntries: ['/album/1'],
      path: "/album/:id",
      route:

        <AlbumPage />

    })

  await waitFor(() => {
    expect(screen.getByText('Not found')).toBeInTheDocument()
  })
})
