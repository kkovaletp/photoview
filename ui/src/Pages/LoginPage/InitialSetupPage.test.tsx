import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
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
    localStorage.clear()
    localStorage.setItem('ethical_use_terms_accepted', 'true')
    authToken.mockImplementation(() => undefined)
    mockNavigate.mockClear()
  })

  afterEach(() => {
    localStorage.clear()
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

describe('InitialSetupPage - Terms of Use', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear() // terms NOT accepted — modal will show
    authToken.mockImplementation(() => undefined)
    mockNavigate.mockClear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('shows the Terms of Use modal when terms have not been accepted', async () => {
    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      initialEntries: ['/initialSetup'],
    })

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /terms of use/i })
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /i agree/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /i do not agree/i })).toBeInTheDocument()
    // Form should not be reachable while modal is open
    expect(screen.queryByRole('button', { name: /setup photoview/i })).not.toBeInTheDocument()
  })

  test('dismisses modal and shows the form after accepting terms', async () => {
    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /terms of use/i })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i agree/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Form is now accessible
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()

    // Acceptance is persisted in localStorage
    expect(localStorage.getItem('ethical_use_terms_accepted')).toBe('true')
  })

  test('shows the Access Denied screen after declining terms', async () => {
    vi.spyOn(globalThis, 'close').mockImplementation(() => { })

    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      initialEntries: ['/initialSetup'],
    })

    const user = userEvent.setup()

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /terms of use/i })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /i do not agree/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /access denied/i })
      ).toBeInTheDocument()
    })

    expect(
      screen.getByRole('link', { name: /ethical use license/i })
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
  })

  test('skips modal when terms were previously accepted (localStorage pre-set)', async () => {
    localStorage.setItem('ethical_use_terms_accepted', 'true')

    await renderWithProviders(<InitialSetupPage />, {
      mocks: [mockInitialSetupGraphql(true)],
      initialEntries: ['/initialSetup'],
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })
})
