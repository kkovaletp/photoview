import { MockedProvider } from '@apollo/client/testing/react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaType, OrderDirection } from '../../__generated__/globalTypes'
import { SidebarProvider } from '../../components/sidebar/Sidebar'
import {
  authToken,
  clearSharePassword,
  clearTokenCookie,
  getSharePassword,
  saveSharePassword,
  saveTokenCookie,
} from '../../helpers/authentication'
import { SHARE_ALBUM_QUERY } from './AlbumSharePage'
import {
  SHARE_TOKEN_QUERY,
  TokenRoute,
  VALIDATE_TOKEN_PASSWORD_QUERY,
} from './SharePage'

const reload = vi.hoisted(() => vi.fn())

vi.mock('./reloadSharePage', () => ({
  reloadSharePage: reload,
}))

vi.mock('../../hooks/useScrollPagination', () => ({
  default: () => ({
    containerElem: () => { },
    loadingMore: false,
  }),
}))

vi.mock('../../components/albumGallery/AlbumGallery', async () => {
  const actual = await vi.importActual<
    typeof import('../../components/albumGallery/AlbumGallery')
  >('../../components/albumGallery/AlbumGallery')

  return {
    ...actual,
    default: ({ album }: { album?: { title: string } }) => (
      <div>{album?.title ?? 'Loading album'}</div>
    ),
  }
})

vi.mock('../../components/sidebar/MediaSidebar/MediaSidebar', () => ({
  default: () => <div>Media details</div>,
}))

vi.mock('../../components/layout/MainMenu', () => ({
  default: () => <div>Account menu</div>,
}))

vi.mock('../../components/header/Searchbar', () => ({
  default: () => <div data-testid="search-bar">Search</div>,
}))

const token = 'share-logout-test'
const otherToken = 'another-share-logout-test'
const password = 'share-password'

type ShareKind = 'album' | 'subalbum' | 'media'

const pathFor = (kind: ShareKind) =>
  kind === 'subalbum' ? `/share/${token}/child` : `/share/${token}`

const validationMock = (value: string | undefined, valid: boolean) => ({
  request: {
    query: VALIDATE_TOKEN_PASSWORD_QUERY,
    variables: { token, password: value },
  },
  result: {
    data: { shareTokenValidatePassword: valid },
  },
})

const pageMocks = (
  kind: ShareKind,
  value: string | null,
  hasPassword: boolean
) => {
  const isMedia = kind === 'media'
  const albumID = kind === 'subalbum' ? 'child' : 'root'

  const share = {
    request: {
      query: SHARE_TOKEN_QUERY,
      variables: { token, password: value },
    },
    result: {
      data: {
        shareToken: {
          __typename: 'ShareToken',
          token,
          hasPassword,
          album: isMedia ? null : { __typename: 'Album', id: 'root' },
          media: isMedia
            ? {
              __typename: 'Media',
              id: 'media-1',
              title: 'Shared photo',
              type: MediaType.Photo,
              thumbnail: null,
              downloads: [],
              highRes: null,
              videoWeb: null,
              exif: null,
            }
            : null,
        },
      },
    },
  }

  if (isMedia) return [share]

  return [
    share,
    {
      request: {
        query: SHARE_ALBUM_QUERY,
        variables: {
          id: albumID,
          token,
          password: value,
          limit: 200,
          offset: 0,
          mediaOrderBy: 'date_shot',
          orderDirection: OrderDirection.Asc,
          onlyFavorites: false,
        },
      },
      result: {
        data: {
          album: {
            __typename: 'Album',
            id: albumID,
            title: 'Shared album',
            media: [],
            subAlbums: [],
            thumbnail: null,
          },
        },
      },
    },
  ]
}

const renderShare = (
  kind: ShareKind,
  mocks: React.ComponentProps<typeof MockedProvider>['mocks']
) =>
  render(
    <MockedProvider
      mocks={mocks}
      defaultOptions={{
        watchQuery: { fetchPolicy: 'no-cache' },
        query: { fetchPolicy: 'no-cache' },
      }}
    >
      <MemoryRouter initialEntries={[pathFor(kind)]}>
        <SidebarProvider>
          <Routes>
            <Route path="/share/:token/*" element={<TokenRoute />} />
          </Routes>
        </SidebarProvider>
      </MemoryRouter>
    </MockedProvider>
  )

const waitForShare = async (kind: ShareKind) => {
  if (kind === 'media') {
    await screen.findByText('Shared photo')
  } else {
    await screen.findByText('Shared album')
  }
}

afterEach(() => {
  cleanup()
  clearSharePassword(token)
  clearSharePassword(otherToken)
  clearTokenCookie()
  vi.clearAllMocks()
})

describe('share logout', () => {
  it.each<ShareKind>(['album', 'subalbum', 'media'])(
    'clears only this share password and requests a reload for %s',
    async kind => {
      const user = userEvent.setup()
      saveSharePassword(token, password)
      saveSharePassword(otherToken, 'other-password')
      reload.mockImplementation(() => {
        expect(getSharePassword(token)).toBeUndefined()
      })

      renderShare(kind, [
        validationMock(password, true),
        ...pageMocks(kind, password, true),
      ])

      await waitForShare(kind)
      const logoGroup = screen.getByAltText('Photoview logo').closest('div')
      expect(logoGroup).not.toBeNull()
      const button = within(logoGroup!).getByRole('button', { name: 'Log out' })

      await user.click(button)

      expect(reload).toHaveBeenCalledOnce()
      expect(getSharePassword(token)).toBeUndefined()
      expect(getSharePassword(otherToken)).toBe('other-password')
    }
  )

  it.each([
    ['album', undefined],
    ['media', undefined],
    ['album', 'stale-password'],
    ['media', 'stale-password'],
  ] as const)(
    'hides logout on a public %s share with cookie %s',
    async (kind, storedPassword) => {
      if (storedPassword) saveSharePassword(token, storedPassword)

      renderShare(kind, [
        validationMock(storedPassword, true),
        ...pageMocks(kind, storedPassword ?? null, false),
      ])

      await waitForShare(kind)
      expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
    }
  )

  it('returns to the password prompt after reload and accepts the password again', async () => {
    const user = userEvent.setup()
    saveSharePassword(token, password)

    const firstVisit = renderShare('subalbum', [
      validationMock(password, true),
      ...pageMocks('subalbum', password, true),
    ])

    await waitForShare('subalbum')
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(reload).toHaveBeenCalledOnce()
    expect(getSharePassword(token)).toBeUndefined()

    // A fresh provider represents the new page load.
    firstVisit.unmount()
    renderShare('subalbum', [
      validationMock(undefined, false),
      validationMock(password, true),
      ...pageMocks('subalbum', password, true),
    ])

    const field = await screen.findByLabelText('Password')
    await user.type(field, password)
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitForShare('subalbum')
    expect(getSharePassword(token)).toBe(password)
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('keeps the account session and search action on a protected share', async () => {
    const user = userEvent.setup()
    saveTokenCookie('account-token')
    saveSharePassword(token, password)

    renderShare('media', [
      validationMock(password, true),
      ...pageMocks('media', password, true),
    ])

    await waitForShare('media')
    expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(authToken()).toBe('account-token')
    expect(getSharePassword(token)).toBeUndefined()
    expect(reload).toHaveBeenCalledOnce()
  })
})
