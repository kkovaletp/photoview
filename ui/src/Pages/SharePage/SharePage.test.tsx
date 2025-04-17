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

// Mock SidebarContext to silence the warning
vi.mock('../../components/sidebar/Sidebar', () => {
  return {
    SidebarContext: {
      Provider: ({ children }: { children: React.ReactNode }) => children,
      Consumer: ({ children }: { children: (value: any) => React.ReactNode }) =>
        children({
          updateSidebar: vi.fn(),
          setPinned: vi.fn(),
          content: null,
          pinned: false
        }),
    },
    useContext: () => ({
      updateSidebar: vi.fn(),
      setPinned: vi.fn(),
      content: null,
      pinned: false
    })
  };
});

// Import after mocks
import { screen, waitForElementToBeRemoved } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/testUtils'
import { SHARE_TOKEN_QUERY, TokenRoute, VALIDATE_TOKEN_PASSWORD_QUERY } from './SharePage'
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
              // Add all required fields to avoid Apollo errors
              thumbnail: {
                url: 'https://example.com/thumbnail.jpg',
                width: 100,
                height: 100
              },
              downloads: [],
              highRes: {
                url: 'https://example.com/shared_image.jpg',
                width: 1000,
                height: 800
              },
              videoWeb: null,
              exif: null
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

    // Just check that loading is gone and the title appears somewhere
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(document.title).toContain('Shared media');
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

    expect(await screen.findByText('Error message not found.')).toBeInTheDocument();
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

    // Wait for loading to finish and verify "Share not found" message
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
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

    expect(await screen.findByText('Share not found')).toBeInTheDocument();
    expect(await screen.findByText('Maybe the share has expired or has been deleted.')).toBeInTheDocument();
  });
});
