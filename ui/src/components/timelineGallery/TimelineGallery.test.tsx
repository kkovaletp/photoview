import { screen, waitFor } from '@testing-library/react'
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
  // Create a filtered version with only favorites
  const favoriteTimelineData = timelineData.filter(item => item.favorite);

  // Setup user event simulation separately
  const user = userEvent.setup();

  // Setup mocks with ALL possible query variations
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
    // Initial view (all items) - explicitly include fromDate undefined
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: { onlyFavorites: false, offset: 0, limit: 200, fromDate: undefined },
      },
      result: { data: { myTimeline: timelineData } },
    },
    // Favorites-only view - explicitly include fromDate undefined
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: { onlyFavorites: true, offset: 0, limit: 200, fromDate: undefined },
      },
      result: { data: { myTimeline: favoriteTimelineData } },
    },
  ];

  renderWithProviders(<TimelineGallery />, {
    mocks,
    initialEntries: ['/timeline']
  });

  // Wait for initial data to load
  const allImages = await screen.findAllByRole('img');
  expect(allImages).toHaveLength(timelineData.length);

  // Toggle favorites filter
  const checkbox = screen.getByLabelText('Show only favorites');
  await user.click(checkbox);

  // Use waitFor instead of waitForElementToBeRemoved to reliably detect the change
  await waitFor(() => {
    // Verify filtered results show up correctly
    expect(screen.getAllByRole('img').length).toBe(favoriteTimelineData.length);
  }, { timeout: 2000 });

  // Verify URL parameter was updated
  expect(window.location.search).toContain('favorites=1');
})

// Test error handling with the actual error message Apollo displays
test('handles error state', async () => {
  const errorMock = {
    request: {
      query: MY_TIMELINE_QUERY,
      variables: { onlyFavorites: false, offset: 0, limit: 200, fromDate: undefined },
    },
    error: new Error('Failed to load timeline'),
  };

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

  renderWithProviders(<TimelineGallery />, {
    mocks: [errorMock, earliestMediaMock],
    initialEntries: ['/timeline']
  });

  // Look for any error message containing the word "Failed" instead of exact text
  const errorElement = await screen.findByText(/Failed/i);
  expect(errorElement).toBeInTheDocument();
})
