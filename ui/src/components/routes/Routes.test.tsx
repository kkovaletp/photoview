import { StrictMode, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  authToken,
  clearTokenCookie,
  saveTokenCookie,
} from '../../helpers/authentication'
import Routes from './Routes'

vi.mock('../../Pages/LoginPage/LoginPage', async () => {
  const { authToken } = await import('../../helpers/authentication')

  return {
    default: () => (
      <div>mocked login page: {authToken() ?? 'signed out'}</div>
    ),
  }
})

// Keep route tests independent of Layout's providers and queries.
// Preserve named exports used by other routing modules.
vi.mock('../layout/Layout', async importOriginal => {
  const original = await importOriginal<typeof import('../layout/Layout')>()

  return {
    ...original,
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
  }
})

const RouterProbe = () => {
  const location = useLocation()
  const navigationType = useNavigationType()
  const navigate = useNavigate()

  return (
    <>
      <output data-testid="pathname">{location.pathname}</output>
      <output data-testid="navigation-type">{navigationType}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Forward
      </button>
    </>
  )
}

beforeEach(() => {
  clearTokenCookie()
})

afterEach(() => {
  cleanup()
  clearTokenCookie()
})

describe('routes', () => {
  test('invalid page should print a "not found" message', () => {
    render(
      <MemoryRouter initialEntries={['/random_non_existent_page']}>
        <Routes />
      </MemoryRouter>
    )

    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  test('rendering the logout route does not clear the token', () => {
    saveTokenCookie('test-token')

    // Server rendering renders the component but does not run effects.
    renderToString(
      <MemoryRouter initialEntries={['/logout']}>
        <Routes />
      </MemoryRouter>
    )

    expect(authToken()).toBe('test-token')
  })

  test.each([
    { basename: '/', token: 'test-token' },
    { basename: '/', token: undefined },
    { basename: '/photoview', token: 'test-token' },
    { basename: '/photoview', token: undefined },
  ])(
    'logout replaces the route under $basename with token=$token',
    async ({ basename, token }) => {
      if (token) {
        saveTokenCookie(token)
      }

      const prefix = basename === '/' ? '' : basename

      render(
        <StrictMode>
          <MemoryRouter
            basename={basename}
            initialEntries={[
              `${prefix}/previous`,
              `${prefix}/logout`,
            ]}
            initialIndex={1}
          >
            <Routes />
            <RouterProbe />
          </MemoryRouter>
        </StrictMode>
      )

      expect(
        await screen.findByText('mocked login page: signed out')
      ).toBeInTheDocument()
      expect(authToken()).toBeUndefined()
      expect(screen.getByTestId('pathname')).toHaveTextContent('/login')
      expect(screen.getByTestId('navigation-type')).toHaveTextContent(
        'REPLACE'
      )

      fireEvent.click(screen.getByRole('button', { name: 'Back' }))

      await waitFor(() => {
        expect(screen.getByTestId('pathname')).toHaveTextContent(
          '/previous'
        )
      })
      expect(authToken()).toBeUndefined()

      fireEvent.click(screen.getByRole('button', { name: 'Forward' }))

      await waitFor(() => {
        expect(screen.getByTestId('pathname')).toHaveTextContent('/login')
      })
      expect(
        await screen.findByText('mocked login page: signed out')
      ).toBeInTheDocument()
    }
  )
})
