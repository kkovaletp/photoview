import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApolloClient, InMemoryCache } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { MockLink } from '@apollo/client/testing'
import SidebarAlbumDownload from './SidebarDownloadAlbum'
import AlbumTitle from '../album/AlbumTitle'
import { Sidebar, SidebarProvider } from './Sidebar'
import {
  renderWithProviders,
  renderWithRouter,
} from '../../helpers/testUtils'
import {
  clearTokenCookie,
  saveTokenCookie,
} from '../../helpers/authentication'

const config = vi.hoisted(() => ({
  endpoint: 'https://api.example.test/api',
}))

vi.mock('../../apolloClient', () => ({
  get API_ENDPOINT() {
    return config.endpoint
  },
}))

// The share path must not open the account-management sidebar.
vi.mock('./AlbumSidebar', () => ({
  default: () => <div data-testid="account-sidebar" />,
}))

const purposes = [
  ['Thumbnails', 'thumbnail,video-thumbnail'],
  ['High resolutions', 'high-res'],
  ['Originals', 'original'],
  ['Converted videos', 'video-web'],
] as const

afterEach(() => {
  clearTokenCookie()
  vi.unstubAllEnvs()
})

describe.each([
  {
    endpoint: '/api',
    prefix: `${location.origin}/api`,
    accountQuery: '',
    shareQuery: '?token=abc123',
  },
  {
    endpoint: '/api/',
    prefix: `${location.origin}/api`,
    accountQuery: '',
    shareQuery: '?token=abc123',
  },
  {
    endpoint: '/photoview/api/',
    prefix: `${location.origin}/photoview/api`,
    accountQuery: '',
    shareQuery: '?token=abc123',
  },
  {
    endpoint: 'https://api.example.test/custom/api/',
    prefix: 'https://api.example.test/custom/api',
    accountQuery: '',
    shareQuery: '?token=abc123',
  },
  {
    endpoint: 'https://api.example.test/api/?trace=1&token=old',
    prefix: 'https://api.example.test/api',
    accountQuery: '?trace=1&token=old',
    shareQuery: '?trace=1&token=abc123',
  },
])('archive links for $endpoint', endpointCase => {
  it.each([
    { base: '/', route: '/album/42', shared: false },
    { base: '/', route: '/share/abc123', shared: true },
    {
      base: '/photoview/',
      route: '/share/abc123',
      shared: true,
    },
    {
      base: '/photoview/',
      route: '/share/abc123/42',
      shared: true,
    },
    {
      base: '/photos/library/',
      route: '/album/42',
      shared: false,
    },
  ])('constructs complete URLs at $base$route', ({ base, route, shared }) => {
    config.endpoint = endpointCase.endpoint
    vi.stubEnv('BASE_URL', base)

    renderWithRouter(
      <SidebarAlbumDownload albumID="42" />,
      {
        basename: base,
        initialEntries: [`${base}${route.slice(1)}`],
      }
    )

    const query = shared
      ? endpointCase.shareQuery
      : endpointCase.accountQuery

    for (const [title, purpose] of purposes) {
      expect(
        screen.getByRole('link', { name: new RegExp(`^${title}`) })
      ).toHaveAttribute(
        'href',
        `${endpointCase.prefix}/download/album/42/${purpose}${query}`
      )
    }

    expect(screen.getAllByRole('link')).toHaveLength(4)
  })
})

describe.each([false, true])(
  'shared album controls with signedIn=%s',
  signedIn => {
    it.each([
      { base: '/', route: '/share/abc123' },
      { base: '/photoview/', route: '/share/abc123' },
      { base: '/photoview/', route: '/share/abc123/42' },
    ])(
      'opens downloads without account queries at $base$route',
      async ({ base, route }) => {
        config.endpoint = 'https://api.example.test/api/'

        if (signedIn) {
          saveTokenCookie('valid-session')
        } else {
          clearTokenCookie()
        }

        const link = new MockLink([])
        const request = vi.spyOn(link, 'request')
        const client = new ApolloClient({
          cache: new InMemoryCache(),
          link,
        })
        const user = userEvent.setup()

        const view = renderWithRouter(
          <ApolloProvider client={client}>
            <SidebarProvider>
              <AlbumTitle
                album={{ id: '42', title: 'Shared album' }}
                disableLink
              />
              <Sidebar />
            </SidebarProvider>
          </ApolloProvider>,
          {
            basename: base,
            initialEntries: [`${base}${route.slice(1)}`],
          }
        )

        try {
          await user.click(
            screen.getByRole('button', { name: 'Download' })
          )

          expect(
            screen.getByRole('link', { name: /^Originals/ })
          ).toHaveAttribute(
            'href',
            'https://api.example.test/api/download/album/42/original?token=abc123'
          )

          expect(
            screen.queryByTestId('account-sidebar')
          ).not.toBeInTheDocument()

          // Neither breadcrumb loading nor download controls need
          // an account-only album query.
          expect(request).not.toHaveBeenCalled()
        } finally {
          view.unmount()
          client.stop()
        }
      }
    )
  }
)

it('retains the account-management entry point outside share routes', async () => {
  saveTokenCookie('valid-session')
  const user = userEvent.setup()

  renderWithProviders(
    <SidebarProvider>
      <AlbumTitle
        album={{ id: '42', title: 'Account album' }}
        disableLink={false}
      />
      <Sidebar />
    </SidebarProvider>,
    {
      mocks: [],
      initialEntries: ['/album/42'],
    }
  )

  await user.click(
    screen.getByRole('button', { name: 'Album options' })
  )

  expect(screen.getByTestId('account-sidebar')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Download' })
  ).not.toBeInTheDocument()
})
