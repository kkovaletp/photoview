// First, all the mock declarations without external dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as object;
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ token: 'TOKEN123' }),
  };
});

// Mock Layout component
vi.mock('../../components/layout/Layout', () => {
  // Define Layout component first, then export it to ensure proper definition
  const Layout = ({ children, title }: { children: React.ReactNode, title?: string }) => (
    <div data-testid="Layout">
      {title && <title>{title}</title>}
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: Layout,
  };
});

// Mock MediaSidebar component
vi.mock('../../components/sidebar/MediaSidebar/MediaSidebar', () => ({
  __esModule: true,
  default: ({ media }: { media: any }) =>
    <div data-testid="MediaSidebar">{media.title}</div>,
}));

// Mock SidebarContext
vi.mock('../../components/sidebar/Sidebar', () => {
  const mockContext = {
    updateSidebar: vi.fn(),
    setPinned: vi.fn(),
    content: null,
    pinned: false
  };

  return {
    __esModule: true,
    SidebarContext: {
      Provider: ({ children }: { children: React.ReactNode }) => children,
      Consumer: ({ children }: { children: (value: any) => React.ReactNode }) =>
        children(mockContext),
    },
    useContext: () => mockContext
  };
});

// Mock the scrollPagination hook
vi.mock('../../hooks/useScrollPagination', () => ({
  default: () => ({
    containerElem: { current: null },
    finished: false
  })
}));

// Mock MediaSharePage and AlbumSharePage components
vi.mock('./MediaSharePage', () => ({
  __esModule: true,
  default: ({ media, token }: { media: any, token: string }) => (
    <div data-testid="MediaSharePage">
      {media.title}
    </div>
  ),
}));

vi.mock('./AlbumSharePage', async () => {
  const actual = await vi.importActual('./AlbumSharePage') as object;
  return {
    ...actual,
    default: ({ albumId, token }: { albumId: string, token: string }) => (
      <div data-testid="AlbumSharePage">
        Album ID: {albumId}, Token: {token}
      </div>
    ),
  };
});

// Most importantly, we need to mock the AuthorizedTokenRoute component
vi.mock('./AuthorizedTokenRoute', () => {
  return {
    __esModule: true,
    default: () => {
      // Import Layout to use our properly mocked version
      const Layout = require('../../components/layout/Layout').default;
      return (
        <Layout title="Mock Share">
          <div data-testid="AuthorizedTokenRouteContent">Mocked content</div>
        </Layout>
      );
    }
  };
});

// AFTER all vi.mock calls, import the modules
import { vi } from 'vitest'
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/testUtils'
import { SHARE_TOKEN_QUERY, TokenRoute, VALIDATE_TOKEN_PASSWORD_QUERY } from './SharePage'
import { SIDEBAR_DOWNLOAD_QUERY } from '../../components/sidebar/SidebarDownloadMedia'
import { SHARE_ALBUM_QUERY } from './AlbumSharePage'
import { MediaType } from '../../__generated__/globalTypes'
import { useParams } from 'react-router-dom'

// Now we can use the mocked functions
describe('TokenRoute tests', () => {
  const token = 'TOKEN123';
  const historyMock = [{ pathname: `/share/${token}` }];

  // Set up mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
    // Access the useParams mock through the imported module
    vi.mocked(useParams).mockReturnValue({ token });
  });

  const validTokenMock = {
    request: {
      query: VALIDATE_TOKEN_PASSWORD_QUERY,
      variables: {
        token,
        password: null,
      },
    },
    result: {
      data: {
        shareTokenValidatePassword: true,
      },
    },
  };

  const mediaDownloadMock = {
    request: {
      query: SIDEBAR_DOWNLOAD_QUERY,
      variables: {
        mediaId: '1',
      },
    },
    result: {
      data: {
        media: {
          id: '1',
          downloads: [],
        },
      },
    },
  };

  test('displays media share page when token contains media', async () => {
    const mediaTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: {
          token,
          password: null,
        },
      },
      result: {
        data: {
          shareToken: {
            token,
            album: null,
            media: {
              id: '1',
              title: 'shared_image.jpg',
              type: MediaType.Photo,
              highRes: {
                url: 'https://example.com/shared_image.jpg',
              },
            },
          },
        },
      },
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, mediaTokenMock, mediaDownloadMock],
      initialEntries: historyMock,
    });

    // Wait for the loading state to disappear
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

    // Verify components are rendered
    expect(screen.getByTestId('Layout')).toBeInTheDocument();
    expect(screen.getByTestId('MediaSharePage')).toBeInTheDocument();
    expect(screen.getByText('shared_image.jpg')).toBeInTheDocument();
  });

  test('displays album share page when token contains album', async () => {
    const albumTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: {
          token,
          password: null,
        },
      },
      result: {
        data: {
          shareToken: {
            token,
            album: {
              id: '1',
            },
            media: null,
          },
        },
      },
    };

    const albumDetailsMock = {
      request: {
        query: SHARE_ALBUM_QUERY,
        variables: {
          id: '1',
          token,
          password: null,
          limit: 200,
          offset: 0,
          mediaOrderBy: 'date_shot',
          mediaOrderDirection: 'ASC',
        },
      },
      result: {
        data: {
          album: {
            id: '1',
            title: 'album_title',
            subAlbums: [],
            thumbnail: {
              url: 'https://photoview.example.com/album_thumbnail.jpg',
            },
            media: [],
          },
        },
      },
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, albumTokenMock, albumDetailsMock],
      initialEntries: historyMock,
    });

    // Wait for the loading state to disappear
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

    // Verify components are rendered
    expect(screen.getByTestId('Layout')).toBeInTheDocument();
    expect(screen.getByTestId('AlbumSharePage')).toBeInTheDocument();
  });

  test('handles error with undefined message', async () => {
    // Create an error with undefined message
    const error = new Error();
    Object.defineProperty(error, 'message', { get: () => undefined });

    const errorMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: {
          token,
          password: null,
        },
      },
      error,
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [errorMock],
      initialEntries: historyMock,
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Error message not found.')).toBeInTheDocument();
    });
  });

  test('handles null shareToken response', async () => {
    const nullTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: {
          token,
          password: null,
        },
      },
      result: {
        data: {
          shareToken: null
        },
      },
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, nullTokenMock],
      initialEntries: historyMock,
    });

    // Wait for loading to finish
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

    // Verify "Share not found" message is displayed
    expect(screen.getByText('Share not found')).toBeInTheDocument();
  });

  test('handles share not found error', async () => {
    const shareNotFoundMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: {
          token,
          password: null,
        },
      },
      error: new Error('GraphQL error: share not found'),
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [shareNotFoundMock],
      initialEntries: historyMock,
    });

    // Verify error messages are displayed
    await waitFor(() => {
      expect(screen.getByText('Share not found')).toBeInTheDocument();
      expect(screen.getByText('Maybe the share has expired or has been deleted.')).toBeInTheDocument();
    });
  });

  test('handles sub-album share page', async () => {
    // First set the mock to return just the token for the initial call
    const useParamsMocked = vi.mocked(useParams);
    useParamsMocked.mockReset();
    // First call returns just the token (for tokenFromParams)
    useParamsMocked.mockReturnValueOnce({ token });
    // Second call returns token and subAlbum (for the nested component)
    useParamsMocked.mockReturnValueOnce({ token, subAlbum: '456' });
    // Any subsequent calls also return both (just in case)
    useParamsMocked.mockReturnValue({ token, subAlbum: '456' });

    const albumTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: {
          token,
          password: null,
        },
      },
      result: {
        data: {
          shareToken: {
            token,
            album: {
              id: '1', // Parent album ID
            },
            media: null,
          },
        },
      },
    };

    const subAlbumDetailsMock = {
      request: {
        query: SHARE_ALBUM_QUERY,
        variables: {
          id: '456', // Sub-album ID
          token,
          password: null,
          limit: 200,
          offset: 0,
          mediaOrderBy: 'date_shot',
          mediaOrderDirection: 'ASC',
        },
      },
      result: {
        data: {
          album: {
            id: '456',
            title: 'subalbum_title',
            subAlbums: [],
            thumbnail: {
              url: 'https://photoview.example.com/subalbum_thumbnail.jpg',
            },
            media: [],
          },
        },
      },
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, albumTokenMock, subAlbumDetailsMock],
      initialEntries: [{ pathname: `/share/${token}/456` }],
    });

    // Wait for loading to finish
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

    // Verify components are rendered
    expect(screen.getByTestId('Layout')).toBeInTheDocument();
    expect(screen.getByTestId('AlbumSharePage')).toBeInTheDocument();
  });
});
