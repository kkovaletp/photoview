import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { MockLink } from '@apollo/client/testing'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimelineGallery, { MY_TIMELINE_QUERY } from './TimelineGallery'
import { timelineData } from './timelineTestData'
import { renderWithProviders } from '../../helpers/testUtils'
import { renderWithRouter } from '../../helpers/testUtils'
import { SidebarProvider } from '../sidebar/Sidebar'
import { MessageProvider } from '../messages/MessageState'

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

const timelineVariables = {
  onlyFavorites: false,
  fromDate: undefined,
  offset: 0,
  limit: 200,
}

function renderTimelineWithCache() {
  const selected = timelineData[0]

  if (selected.thumbnail === null) {
    throw new Error('The selected test media must have a thumbnail')
  }

  const newer = {
    ...selected,
    id: 'newer',
    date: '2021-01-01T18:00:00Z',
    thumbnail: {
      ...selected.thumbnail,
      url: '/photo/newer-thumbnail.jpg',
    },
    album: {
      ...selected.album,
      id: 'newer-album',
      title: 'Newer album',
    },
  }

  const cache = new InMemoryCache()

  cache.writeQuery({
    query: EARLIEST_MEDIA_QUERY,
    data: { __typename: 'Query', myMedia: [] },
  })
  cache.writeQuery({
    query: MY_TIMELINE_QUERY,
    variables: timelineVariables,
    data: { __typename: 'Query', myTimeline: [selected] },
  })

  const client = new ApolloClient({ cache, link: new MockLink([]) })
  const view = renderWithRouter(
    <ApolloProvider client={client}>
      <MessageProvider>
        <SidebarProvider>
          <TimelineGallery />
        </SidebarProvider>
      </MessageProvider>
    </ApolloProvider>,
    { initialEntries: ['/timeline'] }
  )

  return {
    cache,
    client,
    view,
    selected,
    newer,
    selectedUrl: new URL(selected.thumbnail.url, location.origin).href,
  }
}

test('keeps the open media after regrouping and closes when it is removed', async () => {
  const { cache, client, view, selected, newer, selectedUrl } =
    renderTimelineWithCache()
  const user = userEvent.setup()

  try {
    await user.click(await screen.findByRole('presentation'))

    expect(screen.getByTestId('present-img-thumbnail')).toHaveAttribute(
      'src',
      selectedUrl
    )

    // The new date moves the selected media to a different index.
    await act(async () => {
      cache.writeQuery({
        query: MY_TIMELINE_QUERY,
        variables: timelineVariables,
        data: { __typename: 'Query', myTimeline: [newer, selected] },
      })
    })

    await screen.findByRole('link', { name: 'Newer album' })
    expect(screen.getByTestId('present-img-thumbnail')).toHaveAttribute(
      'src',
      selectedUrl
    )

    await act(async () => {
      cache.writeQuery({
        query: MY_TIMELINE_QUERY,
        variables: timelineVariables,
        data: { __typename: 'Query', myTimeline: [newer] },
      })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('present-overlay')).not.toBeInTheDocument()
    })

    act(() => {
      window.dispatchEvent(
        new PopStateEvent('popstate', {
          state: {
            presenting: true,
            activeIndex: { date: 0, album: 0, media: 0 },
          },
        })
      )
    })

    expect(screen.queryByTestId('present-overlay')).not.toBeInTheDocument()
  } finally {
    view.unmount()
    client.stop()
  }
})

test('does not reopen a cleared selection after data changes while closed', async () => {
  const { cache, client, view, selected, newer } = renderTimelineWithCache()
  const user = userEvent.setup()

  try {
    await user.click(await screen.findByRole('presentation'))
    expect(screen.getByTestId('present-overlay')).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(
        new PopStateEvent('popstate', { state: { presenting: false } })
      )
    })
    expect(screen.queryByTestId('present-overlay')).not.toBeInTheDocument()

    await act(async () => {
      cache.writeQuery({
        query: MY_TIMELINE_QUERY,
        variables: timelineVariables,
        data: { __typename: 'Query', myTimeline: [newer, selected] },
      })
    })

    // Wait until the replacement has reached the gallery reducer.
    await screen.findByRole('link', { name: 'Newer album' })

    act(() => {
      window.dispatchEvent(
        new PopStateEvent('popstate', {
          state: {
            presenting: true,
            activeIndex: { date: 0, album: 0, media: 0 },
          },
        })
      )
    })

    expect(screen.queryByTestId('present-overlay')).not.toBeInTheDocument()
  } finally {
    view.unmount()
    client.stop()
  }
})
