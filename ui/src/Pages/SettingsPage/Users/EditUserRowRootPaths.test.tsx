import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gql } from '@apollo/client'
import { MockedResponse } from '@apollo/client/testing'
import { renderWithProviders } from '../../../helpers/testUtils'
import { EditRootPaths } from './EditUserRowRootPaths'
import { USERS_QUERY } from './UsersTable'
import { USER_ADD_ROOT_PATH_MUTATION } from './AddUserRow'
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

        let resolveRemoveMutation!: (value: {
            data: { userRemoveRootAlbum: { __typename: 'Album'; id: string } }
        }) => void

        const removeMutationResult = new Promise<{
            data: { userRemoveRootAlbum: { __typename: 'Album'; id: string } }
        }>(resolve => {
            resolveRemoveMutation = resolve
        })

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_REMOVE_ALBUM_PATH_MUTATION,
                    variables: { userId: 'user-1', albumId: 'album-1' },
                },
                result: () => removeMutationResult as any,
            },
            usersQueryMock,
        ]

        renderComponent(mocks)

        const row = screen.getByText('/photos/A').closest('li') as HTMLElement
        const removeBtn = within(row).getByRole('button', { name: /remove/i })

        expect(removeBtn).not.toBeDisabled()

        await user.click(removeBtn)

        await waitFor(() => expect(removeBtn).toBeDisabled())

        await act(async () => {
            resolveRemoveMutation({
                data: {
                    userRemoveRootAlbum: { __typename: 'Album', id: 'album-1' },
                },
            })
            await removeMutationResult
        })

        await waitFor(() => expect(removeBtn).not.toBeDisabled())

        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    test('logs on remove failure and re-enables the button', async () => {
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

        await waitFor(() =>
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to remove root path: ',
                expect.any(Error)
            )
        )

        // Should not remain disabled after failure
        await waitFor(() => expect(removeBtn).not.toBeDisabled())
    })

    test('adds a root path: trims whitespace, sends correct variables, disables button while loading, and clears input on success', async () => {
        const user = userEvent.setup()

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: USER_ADD_ROOT_PATH_MUTATION,
                    // Expect trimmed value here; if component fails to trim, this mock won't match
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

        // No mutation mocks: clicking "Add" with blank input should early-return
        renderComponent([])

        const input = screen.getByRole('textbox') as HTMLInputElement
        const addBtn = screen.getByRole('button', { name: /^add$/i })

        await user.type(input, '    ')
        await user.click(addBtn)

        // Value remains unchanged (no success clear) and nothing logged
        expect(input.value).toBe('    ')
        expect(addBtn).not.toBeDisabled()
        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    test('logs on add failure and keeps input value (no clear on error)', async () => {
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

        await waitFor(() =>
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to add root path: ',
                expect.any(Error)
            )
        )

        // Should not clear the input on failure
        expect(input.value).toBe('/bad')
        // Re-enabled after the failure
        await waitFor(() => expect(addBtn).not.toBeDisabled())
    })
})
