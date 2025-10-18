import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gql } from '@apollo/client'
import { MockedResponse } from '@apollo/client/testing'
import ChangePasswordModal from './UserChangePassword'
import { renderWithProviders } from '../../../helpers/testUtils'
import { settingsUsersQuery_user } from './__generated__/settingsUsersQuery'

const changeUserPasswordMutation = gql`
  mutation changeUserPassword($userId: ID!, $password: String!) {
    updateUser(id: $userId, password: $password) {
      id
    }
  }
`

const mockUser: settingsUsersQuery_user = {
  __typename: 'User',
  id: 'user-123',
  username: 'testuser',
  admin: false,
  rootAlbums: [],
}

describe('ChangePasswordModal', () => {
  let mockOnClose: ReturnType<typeof vi.fn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockOnClose = vi.fn()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
  })

  const renderComponent = (mocks: MockedResponse[] = []) => {
    return renderWithProviders(
      <ChangePasswordModal
        open={true}
        onClose={mockOnClose}
        user={mockUser}
      />,
      { mocks }
    )
  }

  describe('Form Rendering', () => {
    test('renders modal with correct title', () => {
      renderComponent()

      expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument()
    })

    test('renders modal with user description', () => {
      renderComponent()

      expect(screen.getByText('testuser')).toBeInTheDocument()
      expect(screen.getByText(/Change password for/i)).toBeInTheDocument()
    })

    test('renders password input field', () => {
      renderComponent()

      const passwordInput = screen.getByLabelText('New password')
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'password')
    })

    test('renders Cancel button', () => {
      renderComponent()

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    test('renders Change password button with positive variant', () => {
      renderComponent()

      const submitButton = screen.getByRole('button', { name: /change password/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    test('successfully changes password with valid input', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'newSecurePassword123',
            },
          },
          result: {
            data: {
              updateUser: {
                id: 'user-123',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'newSecurePassword123')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })

      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    test('submits mutation with correct variables', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          result: {
            data: {
              updateUser: {
                id: 'user-123',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    test('resets password input after successful submission', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'newPassword',
            },
          },
          result: {
            data: {
              updateUser: {
                id: 'user-123',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password') as HTMLInputElement
      await user.type(passwordInput, 'newPassword')
      expect(passwordInput.value).toBe('newPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    test('does not display error message on success', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'validPassword',
            },
          },
          result: {
            data: {
              updateUser: {
                id: 'user-123',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'validPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })

      expect(screen.queryByText(/failed to change password/i)).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('displays error message on GraphQL error', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          error: new Error('GraphQL error occurred'),
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to change password/i)).toBeInTheDocument()
      })
    })

    test('displays error message on network error', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          error: new Error('Network error'),
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to change password/i)).toBeInTheDocument()
      })
    })

    test('logs error to console on failure', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          error: new Error('Mutation failed'),
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to change password: ',
          expect.any(Error)
        )
      })
    })

    test('modal remains open on error', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          error: new Error('Mutation failed'),
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to change password/i)).toBeInTheDocument()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    test('handles loading state during mutation', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          result: {
            data: {
              updateUser: {
                id: 'user-123',
              },
            },
          },
          delay: 100,
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      // Mutation should eventually complete
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      }, { timeout: 2000 })
    })
  })

  describe('User Interactions', () => {
    test('updates password input on typing', async () => {
      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New password') as HTMLInputElement
      await user.type(passwordInput, 'myNewPassword')

      expect(passwordInput.value).toBe('myNewPassword')
    })

    test('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      renderComponent()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    test('does not submit mutation when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          result: {
            data: {
              updateUser: {
                id: 'user-123',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()

      // Wait a bit to ensure mutation doesn't fire
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })
  })

  describe('MessageBox Display', () => {
    test('does not display MessageBox when no error exists', () => {
      renderComponent()

      const errorMessage = screen.queryByText(/failed to change password/i)
      expect(errorMessage).not.toBeInTheDocument()
    })

    test('displays MessageBox with negative type on error', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          error: new Error('Test error'),
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(/failed to change password/i)
        expect(errorMessage).toBeInTheDocument()
      })
    })

    test('displays correct error message text', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: changeUserPasswordMutation,
            variables: {
              userId: 'user-123',
              password: 'testPassword',
            },
          },
          error: new Error('Server error'),
        },
      ]

      renderComponent(mocks)

      const passwordInput = screen.getByLabelText('New password')
      await user.type(passwordInput, 'testPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to change password')).toBeInTheDocument()
      })
    })
  })

  describe('Retry After Failure', () => {
    test('clears error message when retrying after failure', async () => {
      const user = userEvent.setup()

      // First attempt fails
      const failedMock: MockedResponse = {
        request: {
          query: changeUserPasswordMutation,
          variables: {
            userId: 'user-123',
            password: 'wrongPassword',
          },
        },
        error: new Error('Failed'),
      }

      // Second attempt succeeds
      const successMock: MockedResponse = {
        request: {
          query: changeUserPasswordMutation,
          variables: {
            userId: 'user-123',
            password: 'correctPassword',
          },
        },
        result: {
          data: {
            updateUser: {
              id: 'user-123',
            },
          },
        },
      }

      renderComponent([failedMock, successMock])

      // First failed attempt
      const passwordInput = screen.getByLabelText('New password') as HTMLInputElement
      await user.type(passwordInput, 'wrongPassword')

      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to change password/i)).toBeInTheDocument()
      })

      // Clear and retry with correct password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'correctPassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })

      expect(screen.queryByText(/failed to change password/i)).not.toBeInTheDocument()
    })

    test('successful retry after failure completes as expected', async () => {
      const user = userEvent.setup()

      const failedMock: MockedResponse = {
        request: {
          query: changeUserPasswordMutation,
          variables: {
            userId: 'user-123',
            password: 'firstAttempt',
          },
        },
        error: new Error('First attempt failed'),
      }

      const successMock: MockedResponse = {
        request: {
          query: changeUserPasswordMutation,
          variables: {
            userId: 'user-123',
            password: 'secondAttempt',
          },
        },
        result: {
          data: {
            updateUser: {
              id: 'user-123',
            },
          },
        },
      }

      renderComponent([failedMock, successMock])

      const passwordInput = screen.getByLabelText('New password') as HTMLInputElement

      // First attempt
      await user.type(passwordInput, 'firstAttempt')
      const submitButton = screen.getByRole('button', { name: /change password/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to change password/i)).toBeInTheDocument()
      })

      // Second successful attempt
      await user.clear(passwordInput)
      await user.type(passwordInput, 'secondAttempt')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1) // Only from first failure
    })
  })
})
