import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimelineGallery, { MY_TIMELINE_QUERY } from './TimelineGallery'
import { timelineData } from './timelineTestData'
import { renderWithProviders } from '../../helpers/testUtils'
import { gql } from '@apollo/client'

vi.mock('../../hooks/useScrollPagination')

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

beforeEach(() => {
  globalThis.history.replaceState(null, '', '/timeline')
})

const earliestMediaMock = {
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
        },
      ],
    },
  },
}

test('timeline with media', async () => {
  const graphqlMocks = [
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: {
          onlyFavorites: false,
          fromDate: undefined,
          offset: 0,
          limit: 200,
        },
      },
      result: {
        data: {
          myTimeline: timelineData,
        },
      },
    },
    earliestMediaMock,
  ]

  renderWithProviders(<TimelineGallery />, {
    mocks: graphqlMocks,
    initialEntries: ['/timeline'],
  })

  expect(screen.getByLabelText('Show only favorites')).toBeInTheDocument()
  expect(await screen.findAllByRole('link')).toHaveLength(4)
  expect(await screen.findAllByRole('presentation')).toHaveLength(5)
})

test('shows loading state', async () => {
  const timelineMock = {
    request: {
      query: MY_TIMELINE_QUERY,
      variables: {
        onlyFavorites: false,
        fromDate: undefined,
        offset: 0,
        limit: 200,
      },
    },
    result: { data: { myTimeline: timelineData } },
    delay: 200,
  }

  renderWithProviders(<TimelineGallery />, {
    mocks: [earliestMediaMock, timelineMock],
    initialEntries: ['/timeline'],
  })

  expect(screen.getByLabelText('Show only favorites')).toBeInTheDocument()
  expect(screen.queryAllByRole('presentation')).toHaveLength(0)

  expect(await screen.findAllByRole('presentation')).toHaveLength(5)
})

test('does not show pagination loader for an empty timeline', async () => {
  const emptyEarliestMediaMock = {
    request: {
      query: EARLIEST_MEDIA_QUERY,
      variables: {},
    },
    result: {
      data: {
        myMedia: [],
      },
    },
  }

  const emptyTimelineMock = {
    request: {
      query: MY_TIMELINE_QUERY,
      variables: {
        onlyFavorites: false,
        fromDate: undefined,
        offset: 0,
        limit: 200,
      },
    },
    result: {
      data: {
        myTimeline: [],
      },
    },
  }

  renderWithProviders(<TimelineGallery />, {
    mocks: [emptyEarliestMediaMock, emptyTimelineMock],
    initialEntries: ['/timeline'],
  })

  await waitFor(() => {
    expect(screen.getByLabelText('Show only favorites')).toBeInTheDocument()
  })

  expect(screen.queryAllByRole('presentation')).toHaveLength(0)
  expect(screen.queryByLabelText('Loading more media')).not.toBeInTheDocument()
})

test('filter by favorites', async () => {
  const favoriteTimelineData = timelineData.filter(item => item.favorite)

  if (favoriteTimelineData.length === 0) {
    favoriteTimelineData.push({ ...timelineData[0], favorite: true })
  }

  const user = userEvent.setup()

  const mocks = [
    earliestMediaMock,
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: {
          onlyFavorites: false,
          fromDate: undefined,
          offset: 0,
          limit: 200,
        },
      },
      result: { data: { myTimeline: timelineData } },
    },
    {
      request: {
        query: MY_TIMELINE_QUERY,
        variables: {
          onlyFavorites: true,
          fromDate: undefined,
          offset: 0,
          limit: 200,
        },
      },
      result: { data: { myTimeline: favoriteTimelineData } },
    },
  ]

  renderWithProviders(<TimelineGallery />, {
    mocks,
    initialEntries: ['/timeline'],
  })

  await waitFor(
    () => {
      expect(screen.queryAllByRole('presentation').length).toBeGreaterThan(0)
    },
    { timeout: 2000 }
  )

  const checkbox = screen.getByLabelText('Show only favorites')
  await user.click(checkbox)

  await waitFor(
    () => {
      expect(globalThis.location.search).toContain('favorites=1')
    },
    { timeout: 1000 }
  )

  await waitFor(
    () => {
      const images = screen.getAllByRole('presentation')
      expect(images.length).toBe(favoriteTimelineData.length)
    },
    { timeout: 3000 }
  )
})
