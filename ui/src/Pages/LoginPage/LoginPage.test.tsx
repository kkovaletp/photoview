import { describe, test, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './LoginPage'
import * as authentication from '../../helpers/authentication'
import * as loginUtilities from './loginUtilities'
import { createMemoryHistory } from 'history'
import { mockInitialSetupGraphql } from './loginTestHelpers'
import { renderWithProviders } from '../../helpers/testUtils'
import { gql } from '@apollo/client'

// Mock modules
vi.mock('../../helpers/authentication')
vi.mock('./loginUtilities', async () => {
  const actual = (await vi.importActual('./loginUtilities')) as object
  return {
    ...actual,
    login: vi.fn(),
  }
})

const authToken = vi.mocked(authentication.authToken)
const login = vi.mocked(loginUtilities.login)

// Define the mutation matching the production code
const authorizeMutation = gql`
  mutation Authorize($username: String!, $password: String!) {
    authorizeUser(username: $username, password: $password) {
      success
      status
      token
    }
  }
`

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authToken.mockImplementation(() => null)
  })

  describe('Redirects', () => {
    test('redirects to root when auth token exists', async () => {
      authToken.mockImplementation(() => 'mock-token')

      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false)],
        history,
      })

      await waitFor(() => {
        expect(history.location.pathname).toBe('/')
      })
    })

    test('redirects to initial setup when initialSetup is true', async () => {
      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(true)],
        history,
      })

      await waitFor(() => {
        expect(history.location.pathname).toBe('/initialSetup')
      })
    })
  })

  describe('Form Rendering', () => {
    test('renders login form', async () => {
      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false)],
        history,
      })

      await waitFor(() => {
        expect(screen.getByText('Welcome to Photoview')).toBeInTheDocument()
      })

      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /sign in/i })
      ).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    test('successful login with valid credentials', async () => {
      const authMock = {
        request: {
          query: authorizeMutation,
          variables: {
            username: 'testuser',
            password: 'testpass',
          },
        },
        result: {
          data: {
            authorizeUser: {
              success: true,
              status: null,
              token: 'test-token-123',
            },
          },
        },
      }

      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false), authMock],
        history,
      })

      const user = userEvent.setup()

      // Fill and submit form
      await user.type(screen.getByLabelText('Username'), 'testuser')
      await user.type(screen.getByLabelText('Password'), 'testpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Verify login was called with token
      await waitFor(() => {
        expect(login).toHaveBeenCalledWith('test-token-123')
      })

      // Verify no error message is shown
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    test('failed login displays status error message', async () => {
      const authMock = {
        request: {
          query: authorizeMutation,
          variables: {
            username: 'wronguser',
            password: 'wrongpass',
          },
        },
        result: {
          data: {
            authorizeUser: {
              success: false,
              status: 'Invalid username or password',
              token: null,
            },
          },
        },
      }

      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false), authMock],
        history,
      })

      const user = userEvent.setup()

      // Fill and submit form
      await user.type(screen.getByLabelText('Username'), 'wronguser')
      await user.type(screen.getByLabelText('Password'), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Verify error message is displayed
      await waitFor(() => {
        expect(
          screen.getByText('Invalid username or password')
        ).toBeInTheDocument()
      })

      // Verify login was NOT called
      expect(login).not.toHaveBeenCalled()
    })

    test('network error displays generic error message', async () => {
      const authMock = {
        request: {
          query: authorizeMutation,
          variables: {
            username: 'testuser',
            password: 'testpass',
          },
        },
        error: new Error('Network error'),
      }

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => { })

      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false), authMock],
        history,
      })

      const user = userEvent.setup()

      // Fill and submit form
      await user.type(screen.getByLabelText('Username'), 'testuser')
      await user.type(screen.getByLabelText('Password'), 'testpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Verify generic error message is displayed
      await waitFor(() => {
        expect(
          screen.getByText('An unexpected error occurred during login')
        ).toBeInTheDocument()
      })

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled()
      const matched = consoleErrorSpy.mock.calls.some(([msg]) =>
        String(msg).startsWith('Authorization failed')
      )
      expect(matched).toBe(true)

      // Verify login was NOT called
      expect(login).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    test('submit button disabled during loading', async () => {
      const authMock = {
        request: {
          query: authorizeMutation,
          variables: {
            username: 'testuser',
            password: 'testpass',
          },
        },
        result: {
          data: {
            authorizeUser: {
              success: true,
              status: null,
              token: 'test-token-123',
            },
          },
        },
        delay: 100, // Add delay to observe loading state
      }

      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false), authMock],
        history,
      })

      const user = userEvent.setup()
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Button should be enabled initially
      expect(submitButton).not.toBeDisabled()

      // Fill and submit form
      await user.type(screen.getByLabelText('Username'), 'testuser')
      await user.type(screen.getByLabelText('Password'), 'testpass')
      await user.click(submitButton)

      // Button should be disabled during loading
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // After completion, login should be called
      await waitFor(() => {
        expect(login).toHaveBeenCalledWith('test-token-123')
      })
    })

    test('form validation - required username field', async () => {
      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false)],
        history,
      })

      const user = userEvent.setup()

      // Try to submit without entering username
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByText('Please enter a username')).toBeInTheDocument()
      })

      // Verify login was NOT called
      expect(login).not.toHaveBeenCalled()
    })

    test('error message clears on retry after failure', async () => {
      const failedAuthMock = {
        request: {
          query: authorizeMutation,
          variables: {
            username: 'testuser',
            password: 'wrongpass',
          },
        },
        result: {
          data: {
            authorizeUser: {
              success: false,
              status: 'Invalid password',
              token: null,
            },
          },
        },
      }

      const successAuthMock = {
        request: {
          query: authorizeMutation,
          variables: {
            username: 'testuser',
            password: 'correctpass',
          },
        },
        result: {
          data: {
            authorizeUser: {
              success: true,
              status: null,
              token: 'test-token-456',
            },
          },
        },
      }

      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false), failedAuthMock, successAuthMock],
        history,
      })

      const user = userEvent.setup()

      // First attempt - fail
      await user.type(screen.getByLabelText('Username'), 'testuser')
      await user.type(screen.getByLabelText('Password'), 'wrongpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Verify error appears
      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument()
      })

      // Clear password field and retry with correct password
      const passwordField = screen.getByLabelText('Password')
      await user.clear(passwordField)
      await user.type(passwordField, 'correctpass')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Verify error message is cleared and login succeeds
      await waitFor(() => {
        expect(screen.queryByText('Invalid password')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(login).toHaveBeenCalledWith('test-token-456')
      })
    })

    test('message box is hidden when no error exists', async () => {
      const history = createMemoryHistory()
      history.push('/login')

      await renderWithProviders(<LoginPage />, {
        mocks: [mockInitialSetupGraphql(false)],
        history,
      })

      // Initially, no error alert should be visible
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
