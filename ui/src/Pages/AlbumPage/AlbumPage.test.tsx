import type { ComponentProps } from 'react'
import { gql } from '@apollo/client'
import type { MockLink } from '@apollo/client/testing'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import AlbumPage from './AlbumPage'
import { renderWithProviders } from '../../helpers/testUtils'
import { OrderDirection } from '../../__generated__/globalTypes'
import { ALBUM_GALLERY_FRAGMENT } from '../../components/albumGallery/AlbumGallery'

vi.mock('../../hooks/useScrollPagination', () => ({
  default: () => ({
    containerElem: null,
    loadingMore: false,
  }),
}))

// Isolate page behavior while preserving the real query fragment.
vi.mock(
  '../../components/albumGallery/AlbumGallery',
  async importOriginal => {
    const actual =
      await importOriginal<
        typeof import('../../components/albumGallery/AlbumGallery')
      >()
    const { forwardRef } = await import('react')

    const Gallery = forwardRef<
      HTMLDivElement,
      ComponentProps<typeof actual.default>
    >(function Gallery(
      { album, loading, onlyFavorites, setOnlyFavorites },
      ref
    ) {
      return (
        <div ref={ref} role="region" aria-label="Album gallery">
          {loading && <p role="status">Loading gallery</p>}
          {album && <h1>{album.title}</h1>}
          <label>
            Show only favorites
            <input
              type="checkbox"
              checked={onlyFavorites ?? false}
              onChange={event =>
                setOnlyFavorites?.(event.target.checked)
              }
            />
          </label>
        </div>
      )
    })

    return {
      ...actual,
      default: Gallery,
    }
  }
)

const ALBUM_QUERY = gql`
  ${ALBUM_GALLERY_FRAGMENT}

  query albumQuery(
    $id: ID!
    $onlyFavorites: Boolean
    $mediaOrderBy: String
    $orderDirection: OrderDirection
    $limit: Int
    $offset: Int
  ) {
    album(id: $id) {
      ...AlbumGalleryFields
    }
  }
`

const queryVariables = (onlyFavorites = false) => ({
  id: '1',
  onlyFavorites,
  mediaOrderBy: 'date_shot',
  orderDirection: OrderDirection.Asc,
  offset: 0,
  limit: 200,
})

const albumData = (title = 'Test Album') => ({
  album: {
    __typename: 'Album' as const,
    id: '1',
    title,
    subAlbums: [],
    media: [],
  },
})

function albumMock(onlyFavorites = false) {
  return {
    request: {
      query: ALBUM_QUERY,
      variables: queryVariables(onlyFavorites),
    },
    delay: 0,
    result: {
      data: albumData(),
    },
  }
}

function renderAlbum(mocks: MockLink.MockedResponse[]) {
  return renderWithProviders(<AlbumPage />, {
    mocks,
    initialEntries: ['/album/1'],
    path: '/album/:id',
    route: <AlbumPage />,
  })
}

let previousUrl: string
let previousTitle: string

beforeEach(() => {
  previousUrl = window.location.href
  previousTitle = document.title
  window.history.replaceState(null, '', '/album/1')
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', previousUrl)
  document.title = previousTitle
  vi.restoreAllMocks()
})

test('renders the returned album and updates the page title', async () => {
  renderAlbum([albumMock()])

  expect(
    await screen.findByRole('heading', { name: 'Test Album' })
  ).toBeInTheDocument()

  await waitFor(() => {
    expect(document.title).toContain('Test Album')
  })
})

test('shows loading while the album request is pending', async () => {
  renderAlbum([
    {
      request: {
        query: ALBUM_QUERY,
        variables: queryVariables(),
      },
      delay: Infinity,
      result: {
        data: albumData(),
      },
    },
  ])

  expect(screen.getByRole('status')).toHaveTextContent('Loading gallery')

  await waitFor(() => {
    expect(document.title).toContain('Loading album')
  })

  expect(
    within(
      screen.getByRole('region', { name: 'Album gallery' })
    ).queryByRole('heading')
  ).not.toBeInTheDocument()
})

test('shows the not-found title when the album is null', async () => {
  renderAlbum([
    {
      request: {
        query: ALBUM_QUERY,
        variables: queryVariables(),
      },
      delay: 0,
      result: {
        data: { album: null },
      },
    },
  ])

  await waitFor(() => {
    expect(document.title).toContain('Album not found')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  expect(
    within(
      screen.getByRole('region', { name: 'Album gallery' })
    ).queryByRole('heading')
  ).not.toBeInTheDocument()
})

test('shows the album query error', async () => {
  renderAlbum([
    {
      request: {
        query: ALBUM_QUERY,
        variables: queryVariables(),
      },
      delay: 0,
      error: new Error('Album request failed'),
    },
  ])

  expect(
    await screen.findByText('Error loading album: Album request failed')
  ).toBeInTheDocument()

  expect(
    screen.queryByRole('checkbox', { name: 'Show only favorites' })
  ).not.toBeInTheDocument()
})

test.each([false, true])(
  'changes the favorites filter from %s and requests matching data',
  async initialFavorites => {
    const user = userEvent.setup()

    window.history.replaceState(
      null,
      '',
      `/album/1?favorites=${initialFavorites ? '1' : '0'}`
    )

    const updatedResult = vi.fn(() => ({
      data: albumData('Updated Album'),
    }))

    renderAlbum([
      albumMock(initialFavorites),
      {
        request: {
          query: ALBUM_QUERY,
          variables: queryVariables(!initialFavorites),
        },
        delay: 0,
        result: updatedResult,
      },
    ])

    await screen.findByRole('heading', { name: 'Test Album' })

    const checkbox = screen.getByRole('checkbox', {
      name: 'Show only favorites',
    })

    if (initialFavorites) {
      expect(checkbox).toBeChecked()
    } else {
      expect(checkbox).not.toBeChecked()
    }

    await user.click(checkbox)

    expect(
      new URLSearchParams(window.location.search).get('favorites')
    ).toBe(initialFavorites ? '0' : '1')

    await screen.findByRole('heading', { name: 'Updated Album' })

    expect(updatedResult).toHaveBeenCalledOnce()

    if (initialFavorites) {
      expect(checkbox).not.toBeChecked()
    } else {
      expect(checkbox).toBeChecked()
    }
  }
)

test('rejects a missing album ID', () => {
  // React can report the expected render failure to the console.
  vi.spyOn(console, 'error').mockImplementation(() => { })

  expect(() => renderWithProviders(<AlbumPage />)).toThrow(
    'Expected parameter `id` to be defined for AlbumPage'
  )
})

test.each([false, true])(
  'shows a query error when changing favorites from %s fails',
  async initialFavorites => {
    const user = userEvent.setup()

    window.history.replaceState(
      null,
      '',
      `/album/1?favorites=${initialFavorites ? '1' : '0'}`
    )

    renderAlbum([
      albumMock(initialFavorites),
      {
        request: {
          query: ALBUM_QUERY,
          variables: queryVariables(!initialFavorites),
        },
        delay: 0,
        error: new Error('Favorites request failed'),
      },
    ])

    await screen.findByRole('heading', { name: 'Test Album' })

    await user.click(
      screen.getByRole('checkbox', { name: 'Show only favorites' })
    )

    expect(
      new URLSearchParams(window.location.search).get('favorites')
    ).toBe(initialFavorites ? '0' : '1')

    expect(
      await screen.findByText(
        'Error loading album: Favorites request failed'
      )
    ).toBeInTheDocument()
  }
)
