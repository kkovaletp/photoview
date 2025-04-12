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

const waitForDocumentTitle = async (expectedTitle: string, timeoutMs = 5000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (document.title.includes(expectedTitle)) {
      return true;
    }
    // Small delay between checks
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(
    `Document title didn't update to "${expectedTitle}" within ${timeoutMs}ms. The current title is "${document.title}".`
  );
};

test('AlbumPage renders', async () => {
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

  renderWithProviders(<AlbumPage />, {
    mocks: [mockAlbumQuery],
    initialEntries: ['/album/1'],
    path: "/album/:id",
    route: <AlbumPage />
  })

  expect(screen.getByText('Sort')).toBeInTheDocument()
  expect(screen.getByLabelText('Sort direction')).toBeInTheDocument()
  await waitForDocumentTitle('Test Album');
  await waitFor(() => {
    expect(screen.getByText('Test Album')).toBeInTheDocument()
  }, { timeout: 3000 }) // Increased timeout gives more time for data loading
})

test('AlbumPage shows loading state', async () => {
  // Create a loading mock with delay
  const loadingMock = {
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
    delay: Infinity // Add a delay to ensure component shows loading state
  };

  renderWithProviders(<AlbumPage />, {
    mocks: [loadingMock],
    initialEntries: ['/album/1'],
    path: "/album/:id",
    route: <AlbumPage />
  })

  await waitFor(() => {
    // Using regex to match any text containing "Loading"
    expect(screen.getByText(/Loading/)).toBeInTheDocument()
    expect(document.title).toContain('Loading album')
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

  renderWithProviders(<AlbumPage />, {
    mocks: [notFoundMock],
    initialEntries: ['/album/1'],
    path: "/album/:id",
    route: <AlbumPage />
  })

  await waitFor(() => {
    expect(document.title).toContain('Not found')
    const layout = screen.getByTestId('Layout');
    expect(layout).toBeInTheDocument();
  })
})
