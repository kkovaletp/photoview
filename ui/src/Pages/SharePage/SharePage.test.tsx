// Import vi first to ensure it's available
import { vi } from 'vitest'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as object;
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ token: 'TOKEN123' }),
  };
});

// Import after mocks
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/testUtils'
import { SHARE_TOKEN_QUERY, TokenRoute, VALIDATE_TOKEN_PASSWORD_QUERY } from './SharePage'
import { SHARE_ALBUM_QUERY } from './AlbumSharePage'
import { MediaType } from '../../__generated__/globalTypes'
import { useParams } from 'react-router-dom'

describe('TokenRoute', () => {
  const token = 'TOKEN123';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useParams).mockReturnValue({ token });
  });

  test('displays loading state initially', () => {
    const validTokenMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: { shareTokenValidatePassword: true },
      },
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock],
      initialEntries: [{ pathname: `/share/${token}` }],
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('displays media content when token contains media', async () => {
    const validTokenMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: { shareTokenValidatePassword: true },
      },
    };

    const mediaTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: { token, password: null },
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
              highRes: { url: 'https://example.com/shared_image.jpg' },
            },
          },
        },
      },
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, mediaTokenMock],
      initialEntries: [{ pathname: `/share/${token}` }],
    });

    // Wait for loading to finish
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

    // Just check for the image title, which indicates the media is being displayed
    expect(screen.getByText('shared_image.jpg')).toBeInTheDocument();
  });

  test('displays album content when token contains album', async () => {
    const validTokenMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: { shareTokenValidatePassword: true },
      },
    };

    const albumTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: {
          shareToken: {
            token,
            album: { id: '1' },
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
            thumbnail: { url: 'https://photoview.example.com/album_thumbnail.jpg' },
            media: [],
          },
        },
      },
    };

    const { container } = renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, albumTokenMock, albumDetailsMock],
      initialEntries: [{ pathname: `/share/${token}` }],
    });

    // Wait for loading to finish
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

    // Add a wait to ensure the album data has time to be processed
    await waitFor(() => {
      // Use debug to see what's in the DOM (this will help diagnose issues)
      console.log(container.innerHTML);

      // Use a more flexible query that matches part of the title
      const albumTitle = screen.queryByText(/album/i);
      expect(albumTitle).not.toBeNull();
    }, { timeout: 2000 });
  });

  test('handles error with undefined message', async () => {
    const error = new Error();
    Object.defineProperty(error, 'message', { get: () => undefined });

    const errorMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: { token, password: null },
      },
      error,
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [errorMock],
      initialEntries: [{ pathname: `/share/${token}` }],
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Error message not found.')).toBeInTheDocument();
    });
  });

  test('handles null shareToken response', async () => {
    const validTokenMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: { shareTokenValidatePassword: true },
      },
    };

    const nullTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: { shareToken: null }
      },
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, nullTokenMock],
      initialEntries: [{ pathname: `/share/${token}` }],
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
        variables: { token, password: null },
      },
      error: new Error('GraphQL error: share not found'),
    };

    renderWithProviders(<TokenRoute />, {
      mocks: [shareNotFoundMock],
      initialEntries: [{ pathname: `/share/${token}` }],
    });

    // Verify error messages are displayed
    await waitFor(() => {
      expect(screen.getByText('Share not found')).toBeInTheDocument();
      expect(screen.getByText('Maybe the share has expired or has been deleted.')).toBeInTheDocument();
    });
  });

  test('handles sub-album navigation', async () => {
    const useParamsMocked = vi.mocked(useParams);

    // Configure useParams for sub-album navigation
    useParamsMocked.mockReset();
    useParamsMocked.mockReturnValueOnce({ token });
    useParamsMocked.mockReturnValue({ token, subAlbum: '456' });

    const validTokenMock = {
      request: {
        query: VALIDATE_TOKEN_PASSWORD_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: { shareTokenValidatePassword: true },
      },
    };

    const albumTokenMock = {
      request: {
        query: SHARE_TOKEN_QUERY,
        variables: { token, password: null },
      },
      result: {
        data: {
          shareToken: {
            token,
            album: { id: '1' },
            media: null,
          },
        },
      },
    };

    const subAlbumDetailsMock = {
      request: {
        query: SHARE_ALBUM_QUERY,
        variables: {
          id: '456',
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
            thumbnail: { url: 'https://photoview.example.com/subalbum_thumbnail.jpg' },
            media: [],
          },
        },
      },
    };

    const { container } = renderWithProviders(<TokenRoute />, {
      mocks: [validTokenMock, albumTokenMock, subAlbumDetailsMock],
      initialEntries: [{ pathname: `/share/${token}/456` }],
    });

    // Wait for loading to finish
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

    // Add a wait to ensure the sub-album data has time to be processed
    await waitFor(() => {
      // Use debug to see what's in the DOM (this will help diagnose issues)
      console.log(container.innerHTML);

      // Use a more flexible query that matches part of the title
      const subalbumTitle = screen.queryByText(/subalbum/i);
      expect(subalbumTitle).not.toBeNull();
    }, { timeout: 2000 });
  });
});
