import { StrictMode, type ReactNode } from 'react'
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  gql,
} from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import {
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import App from './App'
import { notificationLink } from './apolloClient'
import { globalMessageHandler } from './components/messages/globalMessageHandler'
import {
  authToken,
  beginIntentionalLogout,
  clearTokenCookie,
  endIntentionalLogout,
  getLogoutState,
  saveTokenCookie,
} from './helpers/authentication'
import { useLoadTranslations } from './localization'

vi.mock('./Pages/LoginPage/LoginPage', () => ({
  default: () => <div>mocked login page</div>,
}))

vi.mock('./components/messages/Messages', () => ({
  default: () => null,
}))

vi.mock('./components/layout/Layout', async importOriginal => {
  const original =
    await importOriginal<typeof import('./components/layout/Layout')>()

  return {
    ...original,
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
  }
})

const ERROR_QUERY = gql`
  query LogoutNotificationTest {
    myUserPreferences {
      id
      language
    }
  }
`

const unauthorized = {
  message: 'unauthorized',
  path: ['myUserPreferences'],
}

const preferencesData = {
  data: {
    myUserPreferences: {
      __typename: 'UserPreferences',
      id: '1',
      language: null,
    },
  },
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeClient(fetchImplementation: typeof fetch) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([
      notificationLink,
      new HttpLink({
        uri: 'http://localhost/api/graphql',
        fetch: fetchImplementation,
      }),
    ]),
  })
}

async function startPendingRequest() {
  let resolveResponse!: (response: Response) => void
  let rejectResponse!: (error: Error) => void

  const response = new Promise<Response>((resolve, reject) => {
    resolveResponse = resolve
    rejectResponse = reject
  })

  const fetchMock = vi.fn(() => response)
  const client = makeClient(fetchMock)
  const pending = client.query({
    query: ERROR_QUERY,
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
  })

  // Ensure the operation has captured its state before logout starts.
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

  return {
    pending,
    respond: (body: unknown, status = 200) => {
      resolveResponse(jsonResponse(body, status))
    },
    reject: (error: Error) => {
      rejectResponse(error)
    },
  }
}

function completeLogout() {
  beginIntentionalLogout()
  clearTokenCookie()
  endIntentionalLogout()
}

beforeEach(() => {
  endIntentionalLogout()
  clearTokenCookie()

  vi.spyOn(globalMessageHandler, 'add').mockImplementation(() => { })
  vi.spyOn(console, 'error').mockImplementation(() => { })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => { })
})

afterEach(() => {
  cleanup()
  endIntentionalLogout()
  clearTokenCookie()
  vi.restoreAllMocks()
})

describe('intentional logout', () => {
  test.each(['/', '/photoview'])(
    'logout skips preferences loading under basename %s',
    async basename => {
      saveTokenCookie('old-token')

      const fetchMock = vi.fn(async () => jsonResponse(preferencesData))
      const client = makeClient(fetchMock)
      const prefix = basename === '/' ? '' : basename

      render(
        <StrictMode>
          <ApolloProvider client={client}>
            <MemoryRouter
              basename={basename}
              initialEntries={[`${prefix}/logout`]}
            >
              <App />
            </MemoryRouter>
          </ApolloProvider>
        </StrictMode>
      )

      expect(
        await screen.findByText('mocked login page')
      ).toBeInTheDocument()

      expect(authToken()).toBeUndefined()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(globalMessageHandler.add).not.toHaveBeenCalled()
      expect(getLogoutState().active).toBe(false)
    }
  )

  test('signed-out translation loading does not send a request', () => {
    const fetchMock = vi.fn(async () => jsonResponse(preferencesData))
    const client = makeClient(fetchMock)

    renderHook(() => useLoadTranslations(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ApolloProvider client={client}>{children}</ApolloProvider>
      ),
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('signed-in translation loading still sends a request', async () => {
    saveTokenCookie('valid-token')

    const fetchMock = vi.fn(async () => jsonResponse(preferencesData))
    const client = makeClient(fetchMock)

    renderHook(() => useLoadTranslations(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ApolloProvider client={client}>{children}</ApolloProvider>
      ),
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
  })

  test('ending logout preserves the state of previous operations', () => {
    const previousState = getLogoutState()

    beginIntentionalLogout()
    endIntentionalLogout()

    expect(previousState.active).toBe(true)
    expect(getLogoutState()).not.toBe(previousState)
    expect(getLogoutState().active).toBe(false)
  })

  test('saving a token resets the current logout state', () => {
    beginIntentionalLogout()
    const previousState = getLogoutState()

    saveTokenCookie('new-token')

    expect(previousState.active).toBe(true)
    expect(getLogoutState().active).toBe(false)
    expect(authToken()).toBe('new-token')
  })

  test('a delayed GraphQL authentication error does not affect a new sign-in', async () => {
    saveTokenCookie('old-token')
    const request = await startPendingRequest()

    completeLogout()
    saveTokenCookie('new-token')

    request.respond({ data: null, errors: [unauthorized] })
    const result = await request.pending

    expect(result.error).toBeDefined()
    expect(globalMessageHandler.add).not.toHaveBeenCalled()
    expect(authToken()).toBe('new-token')
  })

  test.each([401, 403])(
    'a delayed HTTP %i does not affect a new sign-in',
    async status => {
      saveTokenCookie('old-token')
      const request = await startPendingRequest()

      completeLogout()
      saveTokenCookie('new-token')

      request.respond({ errors: [unauthorized] }, status)
      const result = await request.pending

      expect(result.error).toBeDefined()
      expect(globalMessageHandler.add).not.toHaveBeenCalled()
      expect(authToken()).toBe('new-token')
    }
  )

  test('an unrelated GraphQL error in a mixed response remains visible', async () => {
    saveTokenCookie('old-token')
    const request = await startPendingRequest()

    completeLogout()

    request.respond({
      data: null,
      errors: [
        unauthorized,
        {
          message: 'database unavailable',
          path: ['myUserPreferences'],
        },
      ],
    })
    await request.pending

    expect(globalMessageHandler.add).toHaveBeenCalledOnce()
    expect(globalMessageHandler.add).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          content: expect.stringContaining('database unavailable'),
        }),
      })
    )
  })

  test('HTTP 500 remains visible after intentional logout', async () => {
    saveTokenCookie('old-token')
    const request = await startPendingRequest()

    completeLogout()

    request.respond(
      { errors: [{ message: 'database unavailable' }] },
      500
    )
    await request.pending

    expect(globalMessageHandler.add).toHaveBeenCalledOnce()
  })

  test('a connection failure remains visible after intentional logout', async () => {
    saveTokenCookie('old-token')
    const request = await startPendingRequest()

    completeLogout()

    request.reject(new Error('Failed to fetch'))
    await request.pending

    expect(globalMessageHandler.add).toHaveBeenCalledOnce()
  })

  test('a missing token alone does not suppress unexpected authentication errors', async () => {
    saveTokenCookie('expired-token')
    const request = await startPendingRequest()

    // This is not an intentional logout.
    clearTokenCookie()

    request.respond({ data: null, errors: [unauthorized] })
    await request.pending

    expect(globalMessageHandler.add).toHaveBeenCalledOnce()
  })

  test('new operations after another sign-in report authentication failures', async () => {
    saveTokenCookie('old-token')
    completeLogout()
    saveTokenCookie('new-token')

    const request = await startPendingRequest()
    request.respond({ data: null, errors: [unauthorized] })
    await request.pending

    expect(globalMessageHandler.add).toHaveBeenCalledOnce()
    expect(authToken()).toBeUndefined()
  })

  test.each([401, 403])(
    'unexpected HTTP %i still produces a notification and clears the token',
    async status => {
      saveTokenCookie('expired-token')
      const request = await startPendingRequest()

      request.respond({ errors: [unauthorized] }, status)
      await request.pending

      expect(globalMessageHandler.add).toHaveBeenCalledOnce()
      expect(authToken()).toBeUndefined()
    }
  )
})
