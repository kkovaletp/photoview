import { describe, test, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InitialSetupPage from './InitialSetupPage'
import * as authentication from '../../helpers/authentication'
import * as loginUtilities from './loginUtilities'
import { mockInitialSetupGraphql } from './loginTestHelpers'
import { renderWithProviders } from '../../helpers/testUtils'
import { gql } from '@apollo/client'

vi.mock('../../helpers/authentication')
vi.mock('./loginUtilities', async () => {
  const actual = await vi.importActual('./loginUtilities') as object
  return {
    ...actual,
    login: vi.fn(),
  }
})

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as object
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const authToken = vi.mocked(authentication.authToken)
const login = vi.mocked(loginUtilities.login)

const initialSetupMutation = gql`
  mutation InitialSetup(
    $username: String!
    $password: String!
    $rootPath: String!
  ) {
    initialSetupWizard(
      username: $username
      password: $password
      rootPath: $rootPath
    ) {
      success
      status
      token
    }
  }
`

describe('InitialSetupPage - Form Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authToken.mockImplementation(() => undefined)
    mockNavigate.mockClear()
  })

  test('successful setup with valid credentials', async () => {
    const setupMock = {
      request: {
        query: initialSetupMutation,
        variables: {
          username: 'admin',
          password: 'password123',
          rootPath: '/photos',
        },
      },
      result: {
        data: {
          initialSetupWizard: {
            success: true,
            status: null,
            token: 'test-token-123',
          },
        },
      },
    }

    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true), setupMock],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()

    // Fill in the form
    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Photo path'), '/photos')

    // Submit the form
    await user.click(screen.getByRole('button', { name: /setup photoview/i }))

    // Verify login was called with the token
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test-token-123')
    })
  })

  test('failed setup displays status error message', async () => {
    const setupMock = {
      request: {
        query: initialSetupMutation,
        variables: {
          username: 'admin',
          password: 'weak',
          rootPath: '/photos',
        },
      },
      result: {
        data: {
          initialSetupWizard: {
            success: false,
            status: 'Password is too weak',
            token: null,
          },
        },
      },
    }

    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true), setupMock],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'weak')
    await user.type(screen.getByLabelText('Photo path'), '/photos')
    await user.click(screen.getByRole('button', { name: /setup photoview/i }))

    // Verify error message is displayed
    expect(await screen.findByText(/password is too weak/i)).toBeInTheDocument()

    // Verify login was NOT called
    expect(login).not.toHaveBeenCalled()
  })

  test('network error displays generic error message', async () => {
    const setupMock = {
      request: {
        query: initialSetupMutation,
        variables: {
          username: 'admin',
          password: 'password123',
          rootPath: '/photos',
        },
      },
      error: new Error('Network error'),
    }

    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true), setupMock],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Photo path'), '/photos')
    await user.click(screen.getByRole('button', { name: /setup photoview/i }))

    // Verify generic error message is displayed
    expect(await screen.findByText(/an unexpected error occurred during setup/i)).toBeInTheDocument()

    expect(login).not.toHaveBeenCalled()
  })

  test('submit button is disabled during loading', async () => {
    const setupMock = {
      request: {
        query: initialSetupMutation,
        variables: {
          username: 'admin',
          password: 'password123',
          rootPath: '/photos',
        },
      },
      result: {
        data: {
          initialSetupWizard: {
            success: true,
            status: null,
            token: 'test-token-123',
          },
        },
      },
      delay: 100, // Simulate network delay
    }

    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true), setupMock],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()
    const submitButton = screen.getByRole('button', { name: /setup photoview/i })

    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Photo path'), '/photos')

    // Submit and check if button is disabled
    await user.click(submitButton)

    await waitFor(() => expect(submitButton).toBeDisabled())

    // Wait for completion
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test-token-123')
    })
  })

  test('error message clears on retry', async () => {
    const failedSetupMock = {
      request: {
        query: initialSetupMutation,
        variables: {
          username: 'admin',
          password: 'weak',
          rootPath: '/photos',
        },
      },
      result: {
        data: {
          initialSetupWizard: {
            success: false,
            status: 'Password is too weak',
            token: null,
          },
        },
      },
    }

    const successSetupMock = {
      request: {
        query: initialSetupMutation,
        variables: {
          username: 'admin',
          password: 'strong-password-123',
          rootPath: '/photos',
        },
      },
      result: {
        data: {
          initialSetupWizard: {
            success: true,
            status: null,
            token: 'test-token-123',
          },
        },
      },
    }

    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true), failedSetupMock, successSetupMock],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()

    // First attempt - fail
    await user.type(screen.getByLabelText('Username'), 'admin')
    await user.type(screen.getByLabelText('Password'), 'weak')
    await user.type(screen.getByLabelText('Photo path'), '/photos')
    await user.click(screen.getByRole('button', { name: /setup photoview/i }))

    expect(await screen.findByText(/password is too weak/i)).toBeInTheDocument()

    // Clear password and try again with strong password
    const passwordInput = screen.getByLabelText('Password')
    await user.clear(passwordInput)
    await user.type(passwordInput, 'strong-password-123')
    await user.click(screen.getByRole('button', { name: /setup photoview/i }))

    // Error should clear and login should succeed
    await waitFor(() => {
      expect(screen.queryByText('Password is too weak')).not.toBeInTheDocument()
      expect(login).toHaveBeenCalledWith('test-token-123')
    })
  })

  test('form validation - required fields', async () => {
    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /setup photoview/i }))

    // Validation errors should appear
    expect(await screen.findByText(/please enter a username/i)).toBeInTheDocument()
    expect(await screen.findByText(/please enter a password/i)).toBeInTheDocument()
    expect(await screen.findByText(/please enter a photo path/i)).toBeInTheDocument()

    // Login should not be called
    expect(login).not.toHaveBeenCalled()
  })

  test('message box is hidden when no error', async () => {
    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      initialEntries: ['/initialSetup'],
    })

    // MessageBox should not be visible initially
    const messageBoxes = screen.queryAllByRole('alert')
    expect(messageBoxes).toHaveLength(0)
  })
})
