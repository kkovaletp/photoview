import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedResponse } from '@apollo/client/testing'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { GraphQLError } from 'graphql'
import { gql } from '@apollo/client'
import UserRow from './UserRow'
import { renderWithProviders } from '../../../helpers/testUtils'
import { settingsUsersQuery_user } from './__generated__/settingsUsersQuery'

const updateUserMutation = gql`
    mutation updateUser($id: ID!, $username: String, $admin: Boolean) {
        updateUser(id: $id, username: $username, admin: $admin) {
            id
            username
            admin
        }
    }
`

const deleteUserMutation = gql`
    mutation deleteUser($id: ID!) {
        deleteUser(id: $id) {
            id
            username
        }
    }
`

const scanUserMutation = gql`
    mutation scanUser($userId: ID!) {
        scanUser(userId: $userId) {
            success
        }
    }
`

describe('UserRow', () => {
    const mockUser: settingsUsersQuery_user = {
        __typename: 'User',
        id: '1',
        username: 'testuser',
        admin: false,
        rootAlbums: [
            {
                __typename: 'Album',
                id: 'album1',
                filePath: '/photos/testuser',
            },
        ],
    }

    let mockRefetchUsers: ReturnType<typeof vi.fn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        mockRefetchUsers = vi.fn()
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    const renderComponent = (mocks: MockedResponse[] = []) => {
        return renderWithProviders(
            <table>
                <tbody>
                    <UserRow user={mockUser} refetchUsers={mockRefetchUsers} />
                </tbody>
            </table>,
            { mocks }
        )
    }

    describe('Rendering', () => {
        test('renders ViewUserRow by default (not in edit mode)', () => {
            renderComponent()

            expect(screen.getByText('testuser')).toBeInTheDocument()
            expect(screen.getByText('/photos/testuser')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /scan/i })).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: /change password/i })
            ).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
        })

        test('renders EditUserRow when entering edit mode', async () => {
            const user = userEvent.setup()
            renderComponent()

            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
                expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
                expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
            })
        })

        test('displays admin status as disabled checkbox in view mode', () => {
            renderComponent()

            const adminCheckbox = screen.getByRole('checkbox', { name: /admin/i })
            expect(adminCheckbox).toBeDisabled()
            expect(adminCheckbox).not.toBeChecked()
        })

        test('displays admin user with checked checkbox', () => {
            const adminUser: settingsUsersQuery_user = {
                ...mockUser,
                admin: true,
            }

            renderWithProviders(
                <table>
                    <tbody>
                        <UserRow user={adminUser} refetchUsers={mockRefetchUsers} />
                    </tbody>
                </table>,
                { mocks: [] }
            )

            const adminCheckbox = screen.getByRole('checkbox', { name: /admin/i })
            expect(adminCheckbox).toBeChecked()
            expect(adminCheckbox).toBeDisabled()
        })

        test('displays multiple root album paths', () => {
            const userWithMultipleAlbums: settingsUsersQuery_user = {
                ...mockUser,
                rootAlbums: [
                    {
                        __typename: 'Album',
                        id: 'album1',
                        filePath: '/photos/folder1',
                    },
                    {
                        __typename: 'Album',
                        id: 'album2',
                        filePath: '/photos/folder2',
                    },
                    {
                        __typename: 'Album',
                        id: 'album3',
                        filePath: '/photos/folder3',
                    },
                ],
            }

            renderWithProviders(
                <table>
                    <tbody>
                        <UserRow
                            user={userWithMultipleAlbums}
                            refetchUsers={mockRefetchUsers}
                        />
                    </tbody>
                </table>,
                { mocks: [] }
            )

            expect(screen.getByText('/photos/folder1')).toBeInTheDocument()
            expect(screen.getByText('/photos/folder2')).toBeInTheDocument()
            expect(screen.getByText('/photos/folder3')).toBeInTheDocument()
        })
    })

    describe('Update User Mutation', () => {
        test('successfully updates user and exits edit mode', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: updateUserMutation,
                        variables: {
                            id: '1',
                            username: 'updateduser',
                            admin: true,
                        },
                    },
                    result: {
                        data: {
                            updateUser: {
                                __typename: 'User',
                                id: '1',
                                username: 'updateduser',
                                admin: true,
                            },
                        },
                    },
                },
            ]

            renderComponent(mocks)

            // Enter edit mode
            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            // Update username
            const usernameInput = await screen.findByDisplayValue('testuser')
            await user.clear(usernameInput)
            await user.type(usernameInput, 'updateduser')

            // Update admin status
            const adminCheckbox = screen.getByRole('checkbox', { name: /admin/i })
            await user.click(adminCheckbox)

            // Save changes
            const saveButton = screen.getByRole('button', { name: /save/i })
            await user.click(saveButton)

            // Verify refetchUsers was called
            await waitFor(() => {
                expect(mockRefetchUsers).toHaveBeenCalledTimes(1)
            })

            // Verify it exits edit mode back to view mode
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
            })
        })

        test('handles GraphQL error on update', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: updateUserMutation,
                        variables: {
                            id: '1',
                            username: 'testuser',
                            admin: false,
                        },
                    },
                    result: {
                        errors: [new GraphQLError('Update failed')],
                    },
                },
            ]

            renderComponent(mocks)

            // Enter edit mode
            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            // Save without changes
            const saveButton = await screen.findByRole('button', { name: /save/i })
            await user.click(saveButton)

            // Verify error was logged
            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to update user: ',
                    expect.any(Error)
                )
            })

            // Verify refetch was not called
            expect(mockRefetchUsers).not.toHaveBeenCalled()
        })

        test('handles network error on update', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: updateUserMutation,
                        variables: {
                            id: '1',
                            username: 'testuser',
                            admin: false,
                        },
                    },
                    error: new Error('Network error'),
                },
            ]

            renderComponent(mocks)

            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            const saveButton = await screen.findByRole('button', { name: /save/i })
            await user.click(saveButton)

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to update user: ',
                    expect.any(Error)
                )
            })

            expect(mockRefetchUsers).not.toHaveBeenCalled()
        })

        test('disables save button during update mutation', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: updateUserMutation,
                        variables: {
                            id: '1',
                            username: 'testuser',
                            admin: false,
                        },
                    },
                    result: {
                        data: {
                            updateUser: {
                                __typename: 'User',
                                id: '1',
                                username: 'testuser',
                                admin: false,
                            },
                        },
                    },
                    delay: 100,
                },
            ]

            renderComponent(mocks)

            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            const saveButton = await screen.findByRole('button', { name: /save/i })
            expect(saveButton).not.toBeDisabled()

            await user.click(saveButton)

            // Button should be disabled during loading
            await waitFor(() => {
                expect(saveButton).toBeDisabled()
            })

            // Wait for completion
            await waitFor(() => {
                expect(mockRefetchUsers).toHaveBeenCalledTimes(1)
            })
        })
    })

    describe('Delete User Mutation', () => {
        test('successfully deletes user', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: deleteUserMutation,
                        variables: {
                            id: '1',
                        },
                    },
                    result: {
                        data: {
                            deleteUser: {
                                __typename: 'User',
                                id: '1',
                                username: 'testuser',
                            },
                        },
                    },
                },
            ]

            renderComponent(mocks)

            // Open delete modal
            const deleteButton = screen.getByRole('button', { name: /delete/i })
            await user.click(deleteButton)

            // Confirm delete
            const confirmButton = await screen.findByRole('button', {
                name: /delete testuser/i,
            })
            await user.click(confirmButton)

            // Verify refetchUsers was called
            await waitFor(() => {
                expect(mockRefetchUsers).toHaveBeenCalledTimes(1)
            })
        })

        test('handles GraphQL error on delete', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: deleteUserMutation,
                        variables: {
                            id: '1',
                        },
                    },
                    result: {
                        errors: [new GraphQLError('Cannot delete user')],
                    },
                },
            ]

            renderComponent(mocks)

            const deleteButton = screen.getByRole('button', { name: /delete/i })
            await user.click(deleteButton)

            const confirmButton = await screen.findByRole('button', {
                name: /delete testuser/i,
            })
            await user.click(confirmButton)

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to delete user: ',
                    expect.any(Error)
                )
            })

            expect(mockRefetchUsers).not.toHaveBeenCalled()
        })

        test('handles network error on delete', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: deleteUserMutation,
                        variables: {
                            id: '1',
                        },
                    },
                    error: new Error('Network error'),
                },
            ]

            renderComponent(mocks)

            const deleteButton = screen.getByRole('button', { name: /delete/i })
            await user.click(deleteButton)

            const confirmButton = await screen.findByRole('button', {
                name: /delete testuser/i,
            })
            await user.click(confirmButton)

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to delete user: ',
                    expect.any(Error)
                )
            })

            expect(mockRefetchUsers).not.toHaveBeenCalled()
        })

        test('opens and closes delete confirmation modal', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Open modal
            const deleteButton = screen.getByRole('button', { name: /delete/i })
            await user.click(deleteButton)

            // Verify modal content appears
            await waitFor(() => {
                expect(screen.getByText(/delete user/i)).toBeInTheDocument()
                expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
            })

            // Cancel
            const cancelButton = screen.getByRole('button', { name: /cancel/i })
            await user.click(cancelButton)

            // Verify modal is closed
            await waitFor(() => {
                expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
            })
        })
    })

    describe('Scan User Mutation', () => {
        test('successfully scans user', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: scanUserMutation,
                        variables: {
                            userId: '1',
                        },
                    },
                    result: {
                        data: {
                            scanUser: {
                                __typename: 'ScanResult',
                                success: true,
                            },
                        },
                    },
                },
            ]

            renderComponent(mocks)

            const scanButton = screen.getByRole('button', { name: /scan/i })
            await user.click(scanButton)

            await waitFor(() => {
                expect(mockRefetchUsers).toHaveBeenCalledTimes(1)
            })
        })

        test('handles GraphQL error on scan', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: scanUserMutation,
                        variables: {
                            userId: '1',
                        },
                    },
                    result: {
                        errors: [new GraphQLError('Scan failed')],
                    },
                },
            ]

            renderComponent(mocks)

            const scanButton = screen.getByRole('button', { name: /scan/i })
            await user.click(scanButton)

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to scan user: ',
                    expect.any(Error)
                )
            })

            expect(mockRefetchUsers).not.toHaveBeenCalled()
        })

        test('handles network error on scan', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: scanUserMutation,
                        variables: {
                            userId: '1',
                        },
                    },
                    error: new Error('Network error'),
                },
            ]

            renderComponent(mocks)

            const scanButton = screen.getByRole('button', { name: /scan/i })
            await user.click(scanButton)

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to scan user: ',
                    expect.any(Error)
                )
            })

            expect(mockRefetchUsers).not.toHaveBeenCalled()
        })

        test('disables scan button after being clicked', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: scanUserMutation,
                        variables: {
                            userId: '1',
                        },
                    },
                    result: {
                        data: {
                            scanUser: {
                                __typename: 'ScanResult',
                                success: true,
                            },
                        },
                    },
                },
            ]

            renderComponent(mocks)

            const scanButton = screen.getByRole('button', { name: /scan/i })
            expect(scanButton).not.toBeDisabled()

            await user.click(scanButton)

            await waitFor(() => {
                expect(scanButton).toBeDisabled()
            })
        })
    })

    describe('State Management', () => {
        test('cancels edit and restores original state', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Enter edit mode
            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            // Make changes
            const usernameInput = await screen.findByDisplayValue('testuser')
            await user.clear(usernameInput)
            await user.type(usernameInput, 'changeduser')

            const adminCheckbox = screen.getByRole('checkbox', { name: /admin/i })
            await user.click(adminCheckbox)

            // Verify changes are in the input
            expect(usernameInput).toHaveValue('changeduser')
            expect(adminCheckbox).toBeChecked()

            // Cancel
            const cancelButton = screen.getByRole('button', { name: /cancel/i })
            await user.click(cancelButton)

            // Verify back in view mode with original values
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
                expect(screen.getByText('testuser')).toBeInTheDocument()
            })

            // Re-enter edit mode to verify state was restored
            await user.click(screen.getByRole('button', { name: /edit/i }))
            const restoredInput = await screen.findByDisplayValue('testuser')
            expect(restoredInput).toHaveValue('testuser')
            expect(screen.getByRole('checkbox', { name: /admin/i })).not.toBeChecked()
        })

        test('manages change password modal state', async () => {
            const user = userEvent.setup()
            renderComponent()

            const changePasswordButton = screen.getByRole('button', {
                name: /change password/i,
            })
            await user.click(changePasswordButton)

            // Verify modal opens
            await waitFor(() => {
                expect(
                    screen.getByRole('heading', { name: /change password/i })
                ).toBeInTheDocument()
            })
        })
    })

    describe('User Interactions in Edit Mode', () => {
        test('allows editing username', async () => {
            const user = userEvent.setup()
            renderComponent()

            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            const usernameInput = await screen.findByDisplayValue('testuser')
            await user.clear(usernameInput)
            await user.type(usernameInput, 'newusername')

            expect(usernameInput).toHaveValue('newusername')
        })

        test('allows toggling admin status', async () => {
            const user = userEvent.setup()
            renderComponent()

            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            const adminCheckbox = await screen.findByRole('checkbox', {
                name: /admin/i,
            })
            expect(adminCheckbox).not.toBeChecked()

            await user.click(adminCheckbox)
            expect(adminCheckbox).toBeChecked()

            await user.click(adminCheckbox)
            expect(adminCheckbox).not.toBeChecked()
        })
    })

    describe('Retry After Failure', () => {
        test('allows retry after update failure', async () => {
            const user = userEvent.setup()
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: updateUserMutation,
                        variables: {
                            id: '1',
                            username: 'testuser',
                            admin: false,
                        },
                    },
                    result: {
                        errors: [new GraphQLError('Update failed')],
                    },
                },
                {
                    request: {
                        query: updateUserMutation,
                        variables: {
                            id: '1',
                            username: 'testuser',
                            admin: false,
                        },
                    },
                    result: {
                        data: {
                            updateUser: {
                                __typename: 'User',
                                id: '1',
                                username: 'testuser',
                                admin: false,
                            },
                        },
                    },
                },
            ]

            renderComponent(mocks)

            const editButton = screen.getByRole('button', { name: /edit/i })
            await user.click(editButton)

            const saveButton = await screen.findByRole('button', { name: /save/i })

            // First attempt fails
            await user.click(saveButton)

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Failed to update user: ',
                    expect.any(Error)
                )
            })

            // Verify still in edit mode
            expect(saveButton).toBeInTheDocument()

            // Second attempt succeeds
            await user.click(saveButton)

            await waitFor(() => {
                expect(mockRefetchUsers).toHaveBeenCalledTimes(1)
            })

            // Verify exits edit mode
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
            })
        })
    })
})
