import { screen, waitFor } from '@testing-library/react'
import LoginPage from './LoginPage'
import * as authentication from '../../helpers/authentication'
import { createMemoryHistory } from 'history'
import { mockInitialSetupGraphql } from './loginTestHelpers'
import { renderWithProviders } from '../../helpers/testUtils'

vi.mock('../../helpers/authentication.ts')

const authToken = vi.mocked(authentication.authToken)

describe('Login page redirects', () => {
  test('Auth token redirect', async () => {
    authToken.mockImplementation(() => 'some-token')

    const history = createMemoryHistory({
      initialEntries: ['/login'],
    })

    renderWithProviders(<LoginPage />, {
      mocks: [],
      history: history
    })

    await waitFor(() => {
      expect(history.location.pathname).toBe('/')
    })
  })

  test('Initial setup redirect', async () => {
    authToken.mockImplementation(() => null)

    const history = createMemoryHistory({
      initialEntries: ['/login'],
    })

    renderWithProviders(<LoginPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      history: history
    })

    await waitFor(() => {
      expect(history.location.pathname).toBe('/initialSetup')
    })
  })
})

describe('Login page', () => {
  test('Render login form', () => {
    authToken.mockImplementation(() => null)

    const history = createMemoryHistory({
      initialEntries: ['/login'],
    })

    renderWithProviders(<LoginPage />, {
      mocks: [mockInitialSetupGraphql(false)],
      history: history
    })

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sign in')).toBeInTheDocument()
  })
})
