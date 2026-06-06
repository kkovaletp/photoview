import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gql } from '@apollo/client'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import { renderWithProviders } from '../../../helpers/testUtils'
import { EditRootPaths, USER_ADD_ROOT_PATH_MUTATION } from './EditUserRowRootPaths'
import { USERS_QUERY } from './UsersTable'
import { SettingsUsersQueryQuery } from './__generated__/UsersTable'

// Re-declare the internal mutation for MockedProvider matching by printed query
const USER_REMOVE_ALBUM_PATH_MUTATION = gql`
    mutation userRemoveAlbumPathMutation($userId: ID!, $albumId: ID!) {
        userRemoveRootAlbum(userId: $userId, albumId: $albumId) {
            id
        }
    }
`

const baseUser: SettingsUsersQueryQuery['user'][0] = {
    __typename: 'User',
    id: 'user-1',
    username: 'alice',
    admin: false,
    rootAlbums: [
        { __typename: 'Album', id: 'album-1', filePath: '/photos/A' },
        { __typename: 'Album', id: 'album-2', filePath: '/photos/B' },
    ],
}

const usersQueryMock: MockedResponse = {
    request: { query: USERS_QUERY },
    result: {
        data: {
            user: [
                {
                    __typename: 'User',
                    id: 'user-1',
                    username: 'alice',
                    admin: false,
                    rootAlbums: [],
                },
            ],
        },
    },
}

const renderComponent = (mocks: MockedResponse[] = [], user = baseUser) =>
    renderWithProviders(<EditRootPaths user={user} />, { mocks })

describe('EditUserRowRootPaths', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('renders existing root album paths with Remove buttons', () => {
        renderComponent([])

        expect(screen.getByText('/photos/A')).toBeInTheDocument()
        expect(screen.getByText('/photos/B')).toBeInTheDocument()

        const removeButtons = screen.getAllByRole('button', { name: /remove/i })
        expect(removeButtons).toHaveLength(2)
    })

    test('removes a root path: sends correct variables and disables button while loading', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_REMOVE_ALBUM_PATH_MUTATION,
                    variables: { userId: 'user-1', albumId: 'album-1' },
                },
                result: {
                    data: {
                        userRemoveRootAlbum: { __typename: 'Album', id: 'album-1' },
                    },
                },
                delay: 100,
            },
            usersQueryMock,
        ]

        renderComponent(mocks)

        const row = screen.getByText('/photos/A').closest('li') as HTMLElement
        const removeBtn = within(row).getByRole('button', { name: /remove/i })

        expect(removeBtn).not.toBeDisabled()

        await user.click(removeBtn)

        await waitFor(() => expect(removeBtn).toBeDisabled())
        await waitFor(() => expect(removeBtn).not.toBeDisabled())

        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    test('shows inline error and re-enables the button on network remove failure', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_REMOVE_ALBUM_PATH_MUTATION,
                    variables: { userId: 'user-1', albumId: 'album-2' },
                },
                error: new Error('Network error'),
            },
        ]

        renderComponent(mocks)

        const row = screen.getByText('/photos/B').closest('li') as HTMLElement
        const removeBtn = within(row).getByRole('button', { name: /remove/i })

        await user.click(removeBtn)

        // Inline error message appears inside the same list item
        await within(row).findByText('Network error')

        await waitFor(() =>
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to remove root path: ',
                expect.any(Error)
            )
        )

        // Button re-enables after failure
        await waitFor(() => expect(removeBtn).not.toBeDisabled())
    })

    test('shows inline error on GraphQL remove failure', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_REMOVE_ALBUM_PATH_MUTATION,
                    variables: { userId: 'user-1', albumId: 'album-1' },
                },
                result: {
                    errors: [new GraphQLError('Path not found')],
                },
            },
        ]

        renderComponent(mocks)

        const row = screen.getByText('/photos/A').closest('li') as HTMLElement
        const removeBtn = within(row).getByRole('button', { name: /remove/i })

        await user.click(removeBtn)

        await within(row).findByText('Path not found')
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to remove root path: ',
            expect.any(Error)
        )
    })

    test('clears inline remove error and succeeds on retry', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_REMOVE_ALBUM_PATH_MUTATION,
                    variables: { userId: 'user-1', albumId: 'album-1' },
                },
                result: { errors: [new GraphQLError('Temporary failure')] },
            },
            {
                request: {
                    query: USER_REMOVE_ALBUM_PATH_MUTATION,
                    variables: { userId: 'user-1', albumId: 'album-1' },
                },
                result: {
                    data: { userRemoveRootAlbum: { __typename: 'Album', id: 'album-1' } },
                },
            },
            usersQueryMock,
        ]

        renderComponent(mocks)

        const row = screen.getByText('/photos/A').closest('li') as HTMLElement
        const removeBtn = within(row).getByRole('button', { name: /remove/i })

        // First attempt fails
        await user.click(removeBtn)
        await within(row).findByText('Temporary failure')

        // Retry clears the error and succeeds
        await user.click(removeBtn)
        await waitFor(() =>
            expect(within(row).queryByText('Temporary failure')).not.toBeInTheDocument()
        )
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })

    test('adds a root path: trims whitespace, sends correct variables, disables button while loading, and clears input on success', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_ADD_ROOT_PATH_MUTATION,
                    variables: { id: 'user-1', rootPath: '/new/path' },
                },
                result: { data: { userAddRootPath: { __typename: 'Album', id: 'new-1' } } },
                delay: 100,
            },
            usersQueryMock,
        ]

        renderComponent(mocks)

        const input = screen.getByRole('textbox') as HTMLInputElement
        const addBtn = screen.getByRole('button', { name: /^add$/i })

        await user.type(input, '   /new/path   ')
        expect(input.value).toBe('   /new/path   ')

        await user.click(addBtn)

        // Disabled while loading
        await waitFor(() => expect(addBtn).toBeDisabled())

        // Input cleared on success
        await waitFor(() => expect(input.value).toBe(''))

        // Re-enables after completion
        await waitFor(() => expect(addBtn).not.toBeDisabled())

        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    test('does not add a root path when input is blank or whitespace only', async () => {
        const user = userEvent.setup()

        renderComponent([])

        const input = screen.getByRole('textbox') as HTMLInputElement
        const addBtn = screen.getByRole('button', { name: /^add$/i })

        await user.type(input, '    ')
        await user.click(addBtn)

        expect(input.value).toBe('    ')
        expect(addBtn).not.toBeDisabled()
        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    test('shows inline error and keeps input value on network add failure', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_ADD_ROOT_PATH_MUTATION,
                    variables: { id: 'user-1', rootPath: '/bad' },
                },
                error: new Error('Boom'),
            },
        ]

        renderComponent(mocks)

        const input = screen.getByRole('textbox') as HTMLInputElement
        const addBtn = screen.getByRole('button', { name: /^add$/i })

        await user.type(input, '/bad')
        await user.click(addBtn)

        // Inline error message appears
        await screen.findByText('Boom')

        await waitFor(() =>
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to add root path: ',
                expect.any(Error)
            )
        )

        // Input is NOT cleared on failure
        expect(input.value).toBe('/bad')
        // Button re-enables after failure
        await waitFor(() => expect(addBtn).not.toBeDisabled())
    })

    test('shows inline error on GraphQL add failure', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_ADD_ROOT_PATH_MUTATION,
                    variables: { id: 'user-1', rootPath: '/invalid' },
                },
                result: {
                    errors: [new GraphQLError('Invalid path')],
                },
            },
        ]

        renderComponent(mocks)

        const input = screen.getByRole('textbox') as HTMLInputElement
        const addBtn = screen.getByRole('button', { name: /^add$/i })

        await user.type(input, '/invalid')
        await user.click(addBtn)

        await screen.findByText('Invalid path')
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to add root path: ',
            expect.any(Error)
        )
        // Input kept for correction
        expect(input.value).toBe('/invalid')
    })

    test('clears inline add error and succeeds on retry', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_ADD_ROOT_PATH_MUTATION,
                    variables: { id: 'user-1', rootPath: '/bad' },
                },
                result: { errors: [new GraphQLError('Invalid path')] },
            },
            {
                request: {
                    query: USER_ADD_ROOT_PATH_MUTATION,
                    variables: { id: 'user-1', rootPath: '/good' },
                },
                result: { data: { userAddRootPath: { __typename: 'Album', id: 'new-1' } } },
            },
            usersQueryMock,
        ]

        renderComponent(mocks)

        const input = screen.getByRole('textbox') as HTMLInputElement
        const addBtn = screen.getByRole('button', { name: /^add$/i })

        // First attempt fails
        await user.type(input, '/bad')
        await user.click(addBtn)
        await screen.findByText('Invalid path')

        // User corrects the path and retries
        await user.clear(input)
        await user.type(input, '/good')
        await user.click(addBtn)

        // Error is cleared and input is reset on success
        await waitFor(() =>
            expect(screen.queryByText('Invalid path')).not.toBeInTheDocument()
        )
        await waitFor(() => expect(input.value).toBe(''))
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })

    test('no inline error is shown initially', () => {
        renderComponent([])

        expect(screen.queryByText('Failed to remove path. Please try again.')).not.toBeInTheDocument()
        expect(screen.queryByText('Failed to add path. Please try again.')).not.toBeInTheDocument()
    })
})
