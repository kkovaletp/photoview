import { vi } from 'vitest'

vi.mock('../../hooks/useScrollPagination')
vi.mock('../../Pages/SharePage/MediaSharePage', () => {
  const originalModule = vi.importActual('../../Pages/SharePage/MediaSharePage')
  // Define interface for the props
  interface MediaViewProps {
    media?: {
      id?: string;
      title?: string;
      type?: string;
      highRes?: {
        url?: string;
      };
    };
  }
  const MockMediaView = (props: MediaViewProps) =>
    <div data-testid="MediaSharePage">{props.media?.title}</div>
  const MockMediaSharePage = (props: MediaViewProps) => {
    return (
      <div data-testid="Layout">
        <MockMediaView {...props} />
      </div>
    )
  }
  return {
    __esModule: true,
    ...originalModule,
    MediaView: MockMediaView,
    default: MockMediaSharePage,
  }
})

import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { renderWithProviders } from '../../helpers/testUtils'

import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react'

import { clearSharePassword, saveSharePassword } from '../../helpers/authentication'

import {
  SHARE_TOKEN_QUERY,
  TokenRoute,
  VALIDATE_TOKEN_PASSWORD_QUERY,
} from './SharePage'

import { SIDEBAR_DOWNLOAD_QUERY } from '../../components/sidebar/SidebarDownloadMedia'
import { SHARE_ALBUM_QUERY } from './AlbumSharePage'

afterEach(() => {
  vi.restoreAllMocks();
});

describe('load correct share page, based on graphql query', () => {
  const token = 'TOKEN123'
  const password = 'PASSWORD-123_@456\\'

  const historyMock = [{ pathname: `/share/${token}` }]

  const graphqlMocks = [
    {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: {
          token,
          password,
        },
      },
      result: {
        data: {
          shareTokenValidatePassword: true,
        },
      },
    },
    {
      request: {
        query: SIDEBAR_DOWNLOAD_QUERY,
        variables: {
          mediaId: '1',
        },
      },
      result: {
        data: {
          media: {
            __typename: 'Media',
            id: '1',
            downloads: [],
          },
        },
      },
    },
  ]

  beforeAll(() => {
    saveSharePassword(token, password)
  })

  afterAll(() => {
    clearSharePassword(token)
  })

  test('load media share page', async () => {
    const mediaPageMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: {
          token,
          password,
        },
      },
      result: {
        data: {
          shareToken: {
            __typename: 'ShareToken',
            token: token,
            album: null,
            media: {
              __typename: 'Media',
              id: '1',
              title: 'shared_image.jpg',
              type: 'Photo',
              highRes: {
                __typename: 'MediaURL',
                url: 'https://example.com/shared_image.jpg',
              },
            },
          },
        },
      },
    }

    renderWithProviders(<TokenRoute />, {
      mocks: [...graphqlMocks, mediaPageMock],
      initialEntries: historyMock,
      path: "/share/:token/*",
      route: <TokenRoute />,
      apolloOptions: {
        defaultOptions: {
          watchQuery: { fetchPolicy: 'no-cache' },
          query: { fetchPolicy: 'no-cache' }
        }
      }
    })

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'))

    expect(screen.getByTestId('Layout')).toBeInTheDocument()
    expect(screen.getByTestId('MediaSharePage')).toBeInTheDocument()
  })

  test('load album share page', async () => {
    const albumPageMock = [
      {
        request: {
          query: SHARE_TOKEN_QUERY,
          variables: {
            token,
            password,
          },
        },
        result: {
          data: {
            shareToken: {
              __typename: 'ShareToken',
              token: token,
              album: {
                __typename: 'Album',
                id: '1',
              },
              media: null,
            },
          },
        },
      },
      {
        request: {
          query: SHARE_ALBUM_QUERY,
          variables: {
            id: '1',
            token,
            password,
            limit: 200,
            offset: 0,
            mediaOrderBy: 'date_shot',
            mediaOrderDirection: 'ASC',
          },
        },
        result: {
          data: {
            album: {
              __typename: 'Album',
              id: '1',
              title: 'album_title',
              subAlbums: [],
              thumbnail: {
                __typename: 'MediaURL',
                url: 'https://photoview.example.com/album_thumbnail.jpg',
              },
              media: [],
            },
          },
        },
      },
    ]

    renderWithProviders(<TokenRoute />, {
      mocks: [...graphqlMocks, ...albumPageMock],
      initialEntries: historyMock,
      path: "/share/:token/*",
      route: <TokenRoute />,
      apolloOptions: {
        defaultOptions: {
          watchQuery: { fetchPolicy: 'no-cache' },
          query: { fetchPolicy: 'no-cache' }
        }
      }
    })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitForElementToBeRemoved(() => screen.getByText('Loading...'))

    expect(screen.getByTestId('Layout')).toBeInTheDocument()
    expect(screen.getByTestId('AlbumSharePage')).toBeInTheDocument()
  })

  test('load subalbum of a shared album', async () => {
    const subalbumID = '456'
    const subalbumHistoryMock = [{ pathname: `/share/${token}/${subalbumID}` }]

    const subalbumPageMocks = [
      {
        request: {
          query: SHARE_TOKEN_QUERY,
          variables: {
            token,
            password,
          },
        },
        result: {
          data: {
            shareToken: {
              __typename: 'ShareToken',
              token: token,
              album: {
                __typename: 'Album',
                id: subalbumID,
              },
              media: null,
            },
          },
        },
      },
      {
        request: {
          query: SHARE_ALBUM_QUERY,
          variables: {
            id: subalbumID,
            token,
            password,
            limit: 200,
            offset: 0,
            mediaOrderBy: 'date_shot',
            mediaOrderDirection: 'ASC',
          },
        },
        result: {
          data: {
            album: {
              __typename: 'Album',
              id: '1',
              title: 'album_title',
              subAlbums: [],
              thumbnail: {
                __typename: 'MediaURL',
                url: 'https://photoview.example.com/album_thumbnail.jpg',
              },
              media: [],
            },
          },
        },
      },
    ]

    render(
      <MockedProvider
        mocks={[...graphqlMocks, ...subalbumPageMocks]}
        defaultOptions={{
          // disable cache, required to make fragments work
          watchQuery: { fetchPolicy: 'no-cache' },
          query: { fetchPolicy: 'no-cache' },
        }}
      >
        <MemoryRouter initialEntries={subalbumHistoryMock}>
          <Routes>
            <Route path="/share/:token/*" element={<TokenRoute />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitForElementToBeRemoved(() => screen.getByText('Loading...'))

    expect(screen.getByTestId('Layout')).toBeInTheDocument()
    expect(screen.getByTestId('AlbumSharePage')).toBeInTheDocument()
  })

  test('handles error with undefined message', async () => {
    const token = 'TOKEN123'
    const historyMock = [{ pathname: `/share/${token}` }]

    const errorMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: {
          token,
          password,
        },
      },
      error: new Error(),
    }

    // Remove the message property from the error
    Object.defineProperty(errorMock.error, 'message', {
      get: () => undefined
    })

    renderWithProviders(<TokenRoute />, {
      mocks: [errorMock],
      initialEntries: historyMock,
      path: "/share/:token/*",
      route: <TokenRoute />,
    })

    // The actual error message being rendered is "Error message not found"
    await waitFor(() => {
      expect(screen.getByText('Error message not found.')).toBeInTheDocument()
    })
  })

  test('handles null shareToken response', async () => {
    const token = 'TOKEN123'
    const historyMock = [{ pathname: `/share/${token}` }]

    const nullTokenMock = [
      {
        request: {
          query: VALIDATE_TOKEN_PASSWORD_QUERY,
          variables: {
            token,
            password,
          },
        },
        result: {
          data: {
            shareTokenValidatePassword: true,
          },
        },
      },
      {
        request: {
          query: SHARE_TOKEN_QUERY,
          variables: {
            token,
            password,
          },
        },
        result: {
          data: {
            shareToken: null
          },
        },
      },
    ]

    renderWithProviders(<TokenRoute />, {
      mocks: nullTokenMock,
      initialEntries: historyMock,
      path: "/share/:token/*",
      route: <TokenRoute />,
    })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'))

    // Should show "Share not found" when shareToken is null
    expect(screen.getByText('Share not found')).toBeInTheDocument()
  })

  test('handles share not found error', async () => {
    const token = 'TOKEN123'
    const historyMock = [{ pathname: `/share/${token}` }]

    const shareNotFoundMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: {
          token,
          password,
        },
      },
      error: new Error('GraphQL error: share not found'),
    }

    renderWithProviders(<TokenRoute />, {
      mocks: [shareNotFoundMock],
      initialEntries: historyMock,
      path: "/share/:token/*",
      route: <TokenRoute />,
    })

    // Wait for error message to be displayed
    await waitFor(() => {
      expect(screen.getByText('Share not found')).toBeInTheDocument()
      expect(screen.getByText('Maybe the share has expired or has been deleted.')).toBeInTheDocument()
    })
  })

  test(`test the expired`, async () => {
    const expiredValidationMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: { token: 'TOKEN123', password: "PASSWORD-123_@456\\" },
      },
      error: new Error('share expired'),
    };

    render(
      <MockedProvider
        mocks={[expiredValidationMock]}
        defaultOptions={{
          watchQuery: { fetchPolicy: 'no-cache' },
          query: { fetchPolicy: 'no-cache' },
        }}
      >
        <MemoryRouter initialEntries={historyMock}>
          <Routes>
            <Route path="/share/:token/*" element={<TokenRoute />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'))

    expect(screen.getByText(/share expired/i)).toBeInTheDocument()
  })

  test(`test the normal`, async () => {

    const shareTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: { token: 'TOKEN123', password: "PASSWORD-123_@456\\" },
      },
      result: {
        data: {
          shareToken: {
            __typename: 'ShareToken',
            token: 'TOKEN123',
            album: {
              __typename: 'Album',
              id: '1',
            },
            media: null,
          },
        },
      },
    };

    const albumDataMock = {
      request: {
        query: SHARE_ALBUM_QUERY,
        variables: {
          id: '1',
          token: 'TOKEN123',
          password: "PASSWORD-123_@456\\",
          limit: 200,
          offset: 0,
          mediaOrderBy: 'date_shot',
          mediaOrderDirection: 'ASC',
        },
      },
      result: {
        data: {
          album: {
            __typename: 'Album',
            id: '1',
            title: 'normal_album',
            subAlbums: [],
            thumbnail: {
              __typename: 'MediaURL',
              url: '...',
            },
            media: [],
          },
        },
      },
    };

    render(
      <MockedProvider
        mocks={[...graphqlMocks, shareTokenMock, albumDataMock]}
      >
        <MemoryRouter initialEntries={historyMock}>
          <Routes>
            <Route path="/share/:token/*" element={<TokenRoute />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'))

    expect(screen.getByTestId('Layout')).toBeInTheDocument()
    expect(screen.getByTestId('AlbumSharePage')).toBeInTheDocument()
  })
})
