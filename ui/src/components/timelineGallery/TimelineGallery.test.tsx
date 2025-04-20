import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event';
import TimelineGallery, { MY_TIMELINE_QUERY } from './TimelineGallery'
import { timelineData } from './timelineTestData'
import { renderWithProviders } from '../../helpers/testUtils'
import { gql } from '@apollo/client'

vi.mock('../../hooks/useScrollPagination')

// Define the missing query that's used by TimelineFilters component
const EARLIEST_MEDIA_QUERY = gql`
  query earliestMedia {
    myMedia(
      order: { order_by: "date_shot", order_direction: ASC }
      paginate: { limit: 1 }
    ) {
      id
      date
    }
  }
`

test('timeline with media', async () => {
  const graphqlMocks = [
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: { onlyFavorites: false, offset: 0, limit: 200 },
      },
      result: {
        data: {
          myTimeline: timelineData,
        },
      },
    },
    {
      request: {
        query: EARLIEST_MEDIA_QUERY,
        variables: {},
      },
      result: {
        data: {
          myMedia: [
            {
              id: '1001',
              date: '2020-01-01T00:00:00Z',
            }
          ]
        }
      }
    }
  ]

  renderWithProviders(<TimelineGallery />, {
    mocks: graphqlMocks,
    initialEntries: ['/timeline']
  })

  expect(screen.getByLabelText('Show only favorites')).toBeInTheDocument()
  expect(await screen.findAllByRole('link')).toHaveLength(4)
  expect(await screen.findAllByRole('img')).toHaveLength(5)
})

test('shows loading state', async () => {
  const earliestMediaMock = {
    request: {
      query: EARLIEST_MEDIA_QUERY,
      variables: {},
    },
    result: {
      data: {
        myMedia: [{ id: '1001', date: '2020-01-01T00:00:00Z' }]
      }
    },
  };

  const timelineMock = {
    request: {
      query: MY_TIMELINE_QUERY,
      variables: { onlyFavorites: false, offset: 0, limit: 200 },
    },
    result: { data: { myTimeline: timelineData } },
    delay: 200 // Delay to ensure we catch the loading state
  };

  renderWithProviders(<TimelineGallery />, {
    mocks: [earliestMediaMock, timelineMock],
    initialEntries: ['/timeline']
  });

  // During loading, the favorites checkbox exists but no images yet
  expect(screen.getByLabelText('Show only favorites')).toBeInTheDocument();
  expect(screen.queryAllByRole('img')).toHaveLength(0);

  // After loading completes, images should appear
  expect(await screen.findAllByRole('img')).toHaveLength(5);
})

test('filter by favorites', async () => {
  // Create filtered data with known favorite items
  const favoriteTimelineData = timelineData.filter(item => item.favorite);

  // Make sure we have at least one favorite item in test data
  if (favoriteTimelineData.length === 0) {
    // Create a copy with at least one favorite item if needed
    favoriteTimelineData.push({ ...timelineData[0], favorite: true });
  }

  // Setup user event simulation separately
  const user = userEvent.setup();

  // Setup mocks - CRITICAL: Match exact variable ordering from error message
  const mocks = [
    // EARLIEST_MEDIA_QUERY mock
    {
      request: {
        query: EARLIEST_MEDIA_QUERY,
        variables: {},
      },
      result: {
        data: {
          myMedia: [{ id: '1001', date: '2020-01-01T00:00:00Z' }]
        }
      },
    },
    // Initial view (all items) - match exact variable order from network request
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: { onlyFavorites: false, fromDate: undefined, offset: 0, limit: 200 },
      },
      result: { data: { myTimeline: timelineData } },
    },
    // Favorites-only view - match exact variable order from network request
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: { onlyFavorites: true, fromDate: undefined, offset: 0, limit: 200 },
      },
      result: { data: { myTimeline: favoriteTimelineData } },
    },
  ];

  renderWithProviders(<TimelineGallery />, {
    mocks,
    initialEntries: ['/timeline']
  });

  // Wait for initial data to load
  await waitFor(() => {
    expect(screen.queryAllByRole('img').length).toBeGreaterThan(0);
  }, { timeout: 2000 });

  // Toggle favorites filter
  const checkbox = screen.getByLabelText('Show only favorites');
  await user.click(checkbox);

  // Wait for filtered data to load
  await waitFor(() => {
    // Check URL parameter was updated first, as this happens immediately
    expect(window.location.search).toContain('favorites=1');
  }, { timeout: 1000 });

  // Longer timeout for image loading
  await waitFor(() => {
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(favoriteTimelineData.length);
  }, { timeout: 3000 });
})

test('loads present mode from URL/history state', async () => {
  // Mock data for timeline
  const timelineData = [
    {
      id: '1',
      title: 'Test photo',
      type: 'Photo',
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      thumbnail: {
        url: '/test/thumbnail.jpg',
        width: 200,
        height: 150,
      },
      highRes: {
        url: '/test/highres.jpg',
        width: 1920,
        height: 1080,
      },
      videoWeb: null,
      favorite: false,
      album: {
        id: '100',
        title: 'Test Album',
      },
      date: '2022-01-01T00:00:00Z',
    }
  ]

  // Create mocks for both onlyFavorites true and false variations
  const graphqlMocks = [
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: {
          onlyFavorites: false,
          offset: 0,
          limit: 200,
          fromDate: undefined
        },
      },
      result: {
        data: {
          myTimeline: timelineData,
        },
      },
    },
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: {
          onlyFavorites: true,
          offset: 0,
          limit: 200,
          fromDate: undefined
        },
      },
      result: {
        data: {
          myTimeline: timelineData,
        },
      },
    },
    {
      request: {
        query: EARLIEST_MEDIA_QUERY,
        variables: {},
      },
      result: {
        data: {
          myMedia: [
            {
              id: '1',
              date: '2020-01-01T00:00:00Z',
            }
          ]
        }
      }
    }
  ]

  // Set an initial URL with favorites explicitly set to 0 to match our mock
  renderWithProviders(<TimelineGallery />, {
    mocks: graphqlMocks,
    initialEntries: ['/timeline?favorites=0'],
    apolloOptions: {
      addTypename: false,
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'no-cache'
        }
      }
    }
  })

  // Wait for timeline data to load by checking for the presence of the timeline filters
  await waitFor(() => {
    expect(screen.getByLabelText(/show favorites only/i)).toBeInTheDocument()
  })

  // Define the active index that matches our data structure
  const activeIndex = {
    date: 0,
    album: 0,
    media: 0
  }

  // Push state and trigger popstate event
  window.history.pushState({
    activeIndex,
    presenting: true
  }, '', '/timeline?favorites=0&present')

  fireEvent(window, new PopStateEvent('popstate', {
    state: {
      activeIndex,
      presenting: true
    }
  }))

  // Check for presence of present view
  const presentView = await screen.findByTestId('present-view')
  expect(presentView).toBeInTheDocument()
})
