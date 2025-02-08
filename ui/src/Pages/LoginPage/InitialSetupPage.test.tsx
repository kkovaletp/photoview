import { screen, waitFor } from '@testing-library/react'
import { createMemoryHistory } from 'history'
import * as authentication from '../../helpers/authentication'
import InitialSetupPage from './InitialSetupPage'
import { mockInitialSetupGraphql } from './loginTestHelpers'
import { renderWithProviders } from '../../helpers/testUtils'

vi.mock('../../helpers/authentication.ts')

const authToken = vi.mocked(authentication.authToken)

describe('Initial setup page', () => {
  test('Render initial setup form', () => {
    authToken.mockImplementation(() => null)

    const history = createMemoryHistory({
      initialEntries: ['/initialSetup'],
    })

    renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      history: history
    })

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Photo path')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Setup Photoview')).toBeInTheDocument()
  })

  test('Redirect if auth token is present', async () => {
    authToken.mockImplementation(() => 'some-token')

    const history = createMemoryHistory({
      initialEntries: ['/initialSetup'],
    })

    renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      history: history
    })

    await waitFor(() => {
      expect(history.location.pathname).toBe('/')
    })
  })

  test('Redirect if not initial setup', async () => {
    authToken.mockImplementation(() => null)

    const history = createMemoryHistory({
      initialEntries: ['/initialSetup'],
    })

    renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      history: history
    })

    await waitFor(() => {
      expect(history.location.pathname).toBe('/')
    })
  })
})
