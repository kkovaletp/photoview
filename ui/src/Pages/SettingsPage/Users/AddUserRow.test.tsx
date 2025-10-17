import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import AddUserRow, {
  CREATE_USER_MUTATION,
  USER_ADD_ROOT_PATH_MUTATION,
} from './AddUserRow'

describe('AddUserRow', () => {
  let onUserAddedMock: ReturnType<typeof vi.fn>
  let setShowMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onUserAddedMock = vi.fn()
    setShowMock = vi.fn()
  })

  const renderComponent = (mocks: any[]) => {
    return render(
      <MockedProvider mocks={mocks}>
        <table>
          <tbody>
            <AddUserRow
              onUserAdded={onUserAddedMock}
              setShow={setShowMock}
              show={true}
            />
          </tbody>
        </table>
      </MockedProvider>
    )
  }

  describe('User Creation', () => {
    test('creates user successfully with username and root path', async () => {
      const user = userEvent.setup()
      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          result: {
            data: {
              createUser: {
                id: '123',
                username: 'testuser',
                admin: false,
                __typename: 'User',
              },
            },
          },
        },
        {
          request: {
            query: USER_ADD_ROOT_PATH_MUTATION,
            variables: { id: '123', rootPath: '/tmp' },
          },
          result: {
            data: {
              userAddRootPath: { id: '567', __typename: 'Album' },
            },
          },
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const pathInput = screen.getByPlaceholderText('/path/to/photos')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.type(pathInput, '/tmp')
      await user.click(addUserBtn)

      await waitFor(() => {
        expect(onUserAddedMock).toHaveBeenCalledTimes(1)
      })

      expect(setShowMock).not.toHaveBeenCalled()
    })

    test('creates user successfully with username only', async () => {
      const user = userEvent.setup()
      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          result: {
            data: {
              createUser: {
                id: '123',
                username: 'testuser',
                admin: false,
                __typename: 'User',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.click(addUserBtn)

      await waitFor(() => {
        expect(onUserAddedMock).toHaveBeenCalledTimes(1)
      })

      expect(setShowMock).not.toHaveBeenCalled()
    })

    test('creates admin user when checkbox is checked', async () => {
      const user = userEvent.setup()
      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'adminuser', admin: true },
          },
          result: {
            data: {
              createUser: {
                id: '456',
                username: 'adminuser',
                admin: true,
                __typename: 'User',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const adminCheckbox = screen.getByLabelText('Admin')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'adminuser')
      await user.click(adminCheckbox)
      await user.click(addUserBtn)

      await waitFor(() => {
        expect(onUserAddedMock).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling', () => {
    test('displays error message when user creation fails', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          error: new Error('User already exists'),
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.click(addUserBtn)

      await waitFor(() => {
        expect(screen.getByText('User already exists')).toBeInTheDocument()
      })

      expect(onUserAddedMock).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error adding user: ',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    test('displays error message when root path addition fails', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          result: {
            data: {
              createUser: {
                id: '123',
                username: 'testuser',
                admin: false,
                __typename: 'User',
              },
            },
          },
        },
        {
          request: {
            query: USER_ADD_ROOT_PATH_MUTATION,
            variables: { id: '123', rootPath: '/invalid/path' },
          },
          error: new Error('Invalid path'),
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const pathInput = screen.getByPlaceholderText('/path/to/photos')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.type(pathInput, '/invalid/path')
      await user.click(addUserBtn)

      await waitFor(() => {
        expect(screen.getByText('Invalid path')).toBeInTheDocument()
      })

      expect(onUserAddedMock).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error adding user: ',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    test('displays generic error message on network error', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          error: new Error('Network error'),
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.click(addUserBtn)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      expect(onUserAddedMock).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    test('clears error message on retry attempt', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          error: new Error('Database error'),
        },
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          result: {
            data: {
              createUser: {
                id: '123',
                username: 'testuser',
                admin: false,
                __typename: 'User',
              },
            },
          },
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.click(addUserBtn)

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument()
      })

      // Retry
      await user.click(addUserBtn)

      // Error should be cleared and success should occur
      await waitFor(() => {
        expect(screen.queryByText('Database error')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(onUserAddedMock).toHaveBeenCalledTimes(1)
      })

      consoleErrorSpy.mockRestore()
    })

    test('logs error to console on failure', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          error: new Error('Test error'),
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.click(addUserBtn)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error adding user: ',
          expect.any(Error)
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    test('disables submit button during user creation', async () => {
      const user = userEvent.setup()
      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          result: {
            data: {
              createUser: {
                id: '123',
                username: 'testuser',
                admin: false,
                __typename: 'User',
              },
            },
          },
          delay: 100,
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.click(addUserBtn)

      // Button should be disabled during loading
      expect(addUserBtn).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(onUserAddedMock).toHaveBeenCalledTimes(1)
      })
    })

    test('disables submit button during root path addition', async () => {
      const user = userEvent.setup()
      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          result: {
            data: {
              createUser: {
                id: '123',
                username: 'testuser',
                admin: false,
                __typename: 'User',
              },
            },
          },
        },
        {
          request: {
            query: USER_ADD_ROOT_PATH_MUTATION,
            variables: { id: '123', rootPath: '/tmp' },
          },
          result: {
            data: {
              userAddRootPath: { id: '567', __typename: 'Album' },
            },
          },
          delay: 100,
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const pathInput = screen.getByPlaceholderText('/path/to/photos')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.type(pathInput, '/tmp')
      await user.click(addUserBtn)

      // Wait for user creation, then check if button stays disabled during path addition
      await waitFor(() => {
        expect(addUserBtn).toBeDisabled()
      })

      // Wait for completion
      await waitFor(() => {
        expect(onUserAddedMock).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('User Interactions', () => {
    test('cancel button hides the form', async () => {
      const user = userEvent.setup()
      const mocks: any[] = []

      renderComponent(mocks)

      const cancelBtn = screen.getByText('Cancel')
      await user.click(cancelBtn)

      expect(setShowMock).toHaveBeenCalledWith(false)
      expect(onUserAddedMock).not.toHaveBeenCalled()
    })

    test('updates username input correctly', async () => {
      const user = userEvent.setup()
      const mocks: any[] = []

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText(
        'Username'
      ) as HTMLInputElement

      await user.type(usernameInput, 'newuser')

      expect(usernameInput.value).toBe('newuser')
    })

    test('updates root path input correctly', async () => {
      const user = userEvent.setup()
      const mocks: any[] = []

      renderComponent(mocks)

      const pathInput = screen.getByPlaceholderText(
        '/path/to/photos'
      ) as HTMLInputElement

      await user.type(pathInput, '/home/photos')

      expect(pathInput.value).toBe('/home/photos')
    })

    test('updates admin checkbox correctly', async () => {
      const user = userEvent.setup()
      const mocks: any[] = []

      renderComponent(mocks)

      const adminCheckbox = screen.getByLabelText('Admin') as HTMLInputElement

      expect(adminCheckbox.checked).toBe(false)

      await user.click(adminCheckbox)

      expect(adminCheckbox.checked).toBe(true)
    })
  })

  describe('Component Visibility', () => {
    test('returns null when show is false', () => {
      const { container } = render(
        <MockedProvider mocks={[]}>
          <table>
            <tbody>
              <AddUserRow
                onUserAdded={onUserAddedMock}
                setShow={setShowMock}
                show={false}
              />
            </tbody>
          </table>
        </MockedProvider>
      )

      expect(container.querySelector('tr')).not.toBeInTheDocument()
    })

    test('renders when show is true', () => {
      renderComponent([])

      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
      expect(screen.getByText('Add user')).toBeInTheDocument()
    })
  })

  describe('MessageBox Display', () => {
    test('message box is hidden when no error exists', () => {
      renderComponent([])

      // MessageBox should not be visible initially
      expect(
        screen.queryByText('Failed to add user. Please try again.')
      ).not.toBeInTheDocument()
      expect(screen.queryByText('User already exists')).not.toBeInTheDocument()
    })

    test('message box displays with negative type on error', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

      const mocks = [
        {
          request: {
            query: CREATE_USER_MUTATION,
            variables: { username: 'testuser', admin: false },
          },
          error: new Error('Something went wrong'),
        },
      ]

      renderComponent(mocks)

      const usernameInput = screen.getByPlaceholderText('Username')
      const addUserBtn = screen.getByText('Add user')

      await user.type(usernameInput, 'testuser')
      await user.click(addUserBtn)

      const messageBox = await screen.findByText('Something went wrong')
      expect(messageBox).toBeInTheDocument()
      expect(messageBox).toHaveClass('bg-red-200', 'text-red-900')

      consoleErrorSpy.mockRestore()
    })
  })
})
