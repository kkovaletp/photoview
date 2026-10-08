import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gql } from '@apollo/client'
import { MockLink } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import {
    SET_EXPIRE_MUTATION,
    SET_SHARE_LABEL_MUTATION,
    SidebarAlbumShare,
    SidebarPhotoShare,
} from './Sharing'
import { useMessageState } from '../messages/MessageState'
import { NotificationType } from '../../__generated__/globalTypes'

// Mock dependencies
vi.mock('../../helpers/authentication', () => ({
    authToken: vi.fn(() => 'test-token'),
}))

vi.mock('copy-to-clipboard', () => ({
    default: vi.fn(() => Promise.resolve(true)),
}))

// Import the mocked modules for assertions
import copy from 'copy-to-clipboard'
import { authToken } from '../../helpers/authentication'
import { renderWithProviders } from '../../helpers/testUtils'

// GraphQL Queries and Mutations
const SHARE_PHOTO_QUERY = gql`
    query sidebarGetPhotoShares($id: ID!) {
        media(id: $id) {
            id
            shares {
                id
                token
                label
                hasPassword
                expire
            }
        }
    }
`

const SHARE_ALBUM_QUERY = gql`
    query sidebarGetAlbumShares($id: ID!) {
        album(id: $id) {
            id
            shares {
                id
                token
                label
                hasPassword
                expire
            }
        }
    }
`

const ADD_MEDIA_SHARE_MUTATION = gql`
    mutation sidebarPhotoAddShare($id: ID!, $password: String, $expire: Time) {
        shareMedia(mediaId: $id, password: $password, expire: $expire) {
            token
        }
    }
`

const ADD_ALBUM_SHARE_MUTATION = gql`
    mutation sidebarAlbumAddShare($id: ID!, $password: String, $expire: Time) {
        shareAlbum(albumId: $id, password: $password, expire: $expire) {
            token
        }
    }
`

const PROTECT_SHARE_MUTATION = gql`
    mutation sidebarProtectShare($token: String!, $password: String) {
        protectShareToken(token: $token, password: $password) {
        token
        hasPassword
        }
    }
`

const DELETE_SHARE_MUTATION = gql`
    mutation sidebareDeleteShare($token: String!) {
        deleteShareToken(token: $token) {
        token
        }
    }
`

// Test data
const mockPhotoShares = {
    media: {
        id: 'photo-1',
        shares: [
            {
                id: 'share-1',
                token: 'abc123',
                label: 'My Photo Share',
                hasPassword: false,
                expire: null,
                __typename: 'ShareToken',
            },
            {
                id: 'share-2',
                token: 'def456',
                label: 'My Album Share',
                hasPassword: true,
                expire: null,
                __typename: 'ShareToken',
            },
        ],
        __typename: 'Media',
    },
}

const mockAlbumShares = {
    album: {
        id: 'album-1',
        shares: [
            {
                id: 'share-3',
                token: 'ghi789',
                label: 'My Album Share',
                hasPassword: false,
                expire: null,
                __typename: 'ShareToken',
            },
        ],
        __typename: 'Album',
    },
}

const albumQueryRequest = {
    query: SHARE_ALBUM_QUERY,
    variables: { id: 'album-1' },
}

const mockAlbumWithExpiration = {
    album: {
        ...mockAlbumShares.album,
        shares: [
            {
                ...mockAlbumShares.album.shares[0],
                expire: '2099-06-15T12:00:00Z',
            },
        ],
    },
}

// Expose notifications from the real MessageProvider.
// Toast presentation is tested separately by the message component tests.
function SharingNotifications() {
    const { messages } = useMessageState()

    return (
        <>
            {messages
                .filter(message => message.type === NotificationType.Message)
                .map(message => (
                    <div key={message.key} role="alert">
                        <span>{message.props.header}</span>
                        <span>{message.props.content}</span>
                    </div>
                ))}
        </>
    )
}

async function openAlbumShareOptions(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByText('ghi789')
    await user.click(screen.getByRole('button', { name: 'More' }))
}

function formatExpirationDate(date: Date) {
    return new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date)
}

async function selectNextMonthExpiration(
    user: ReturnType<typeof userEvent.setup>,
    input: HTMLElement,
    currentDate: Date
) {
    // The 15th of the next month is unambiguous and remains selectable.
    const selectedDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        15,
        12
    )
    const month = new Intl.DateTimeFormat('en-US', {
        month: 'long',
    }).format(selectedDate)

    await user.click(input)
    await user.click(
        screen.getByRole('button', { name: 'Next Month' })
    )
    await user.click(
        screen.getByRole('gridcell', {
            name: new RegExp(
                `^Choose .*${month} 15th, ${selectedDate.getFullYear()}$`
            ),
        })
    )

    // Construct the expected API value without calling production's dayjs code.
    const year = selectedDate.getFullYear()
    const monthNumber = String(selectedDate.getMonth() + 1).padStart(2, '0')

    return {
        displayValue: formatExpirationDate(selectedDate),
        expire: `${year}-${monthNumber}-15T23:59:59Z`,
    }
}

describe('Sharing Components', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(authToken).mockReturnValue('test-token')
        vi.mocked(copy).mockReset()
        vi.mocked(copy).mockResolvedValue(true)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('SidebarPhotoShare', () => {
        it('should display shares when authenticated', async () => {
            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_PHOTO_QUERY,
                        variables: { id: 'photo-1' },
                    },
                    result: { data: mockPhotoShares },
                },
            ]

            renderWithProviders(<SidebarPhotoShare id="photo-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('My Photo Share')).toBeInTheDocument()
            })

            expect(screen.getByText('abc123')).toBeInTheDocument()
            expect(screen.getByText('def456')).toBeInTheDocument()
        })

        it('should not render shares when not authenticated', () => {
            vi.mocked(authToken).mockReturnValue(undefined)

            const mocks: MockLink.MockedResponse[] = []

            renderWithProviders(<SidebarPhotoShare id="photo-1" />, { mocks })

            // Should not show loading or make the query
            expect(screen.queryByText('Loading shares...')).not.toBeInTheDocument()
            expect(screen.queryByText(/Public Link/)).not.toBeInTheDocument()
        })

        it('should display error when query fails', async () => {
            vi.mocked(authToken).mockReturnValue('test-token')
            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_PHOTO_QUERY,
                        variables: { id: 'photo-1' },
                    },
                    error: new Error('Network error'),
                },
            ]

            renderWithProviders(<SidebarPhotoShare id="photo-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText(/Error: Network error/)).toBeInTheDocument()
            }, { timeout: 3000 })
        })

        it('should create a new share', async () => {
            vi.mocked(authToken).mockReturnValue('test-token')
            const user = userEvent.setup()

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_PHOTO_QUERY,
                        variables: { id: 'photo-1' },
                    },
                    result: { data: mockPhotoShares },
                },
                {
                    request: {
                        query: ADD_MEDIA_SHARE_MUTATION,
                        variables: { id: 'photo-1' },
                    },
                    result: {
                        data: {
                            shareMedia: {
                                token: 'new789',
                                __typename: 'ShareToken',
                            },
                        },
                    },
                },
                {
                    request: {
                        query: SHARE_PHOTO_QUERY,
                        variables: { id: 'photo-1' },
                    },
                    result: {
                        data: {
                            media: {
                                id: 'photo-1',
                                shares: [
                                    ...mockPhotoShares.media.shares,
                                    {
                                        id: 'share-new',
                                        token: 'new789',
                                        label: null,
                                        hasPassword: false,
                                        expire: null,
                                        __typename: 'ShareToken',
                                    },
                                ],
                                __typename: 'Media',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarPhotoShare id="photo-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('abc123')).toBeInTheDocument()
            })

            const addButton = screen.getByText('Add shares')
            await user.click(addButton)

            await waitFor(() => {
                expect(screen.getByText('new789')).toBeInTheDocument()
            })
        })

        it('should load shares for photo-2', async () => {
            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_PHOTO_QUERY,
                        variables: { id: 'photo-2' },
                    },
                    result: {
                        data: {
                            media: {
                                id: 'photo-2',
                                shares: [],
                                __typename: 'Media',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarPhotoShare id="photo-2" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('No shares found')).toBeInTheDocument()
            })
        })
    })

    describe('SidebarAlbumShare', () => {
        it('should load album shares successfully', async () => {
            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })
        })

        it('should display error when query fails', async () => {
            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    error: new Error('Failed to load album shares'),
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(
                    screen.getByText(/Error: Failed to load album shares/)
                ).toBeInTheDocument()
            })
        })

        it('should create a new album share', async () => {
            const user = userEvent.setup()

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
                {
                    request: {
                        query: ADD_ALBUM_SHARE_MUTATION,
                        variables: { id: 'album-1' },
                    },
                    result: {
                        data: {
                            shareAlbum: {
                                token: 'newalbum123',
                                __typename: 'ShareToken',
                            },
                        },
                    },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: {
                        data: {
                            album: {
                                id: 'album-1',
                                shares: [
                                    ...mockAlbumShares.album.shares,
                                    {
                                        id: 'share-4',
                                        token: 'newalbum123',
                                        label: null,
                                        hasPassword: false,
                                        expire: null,
                                        __typename: 'ShareToken',
                                    },
                                ],
                                __typename: 'Album',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const addButton = screen.getByText('Add shares')
            await user.click(addButton)

            await waitFor(() => {
                expect(screen.getByText('newalbum123')).toBeInTheDocument()
            })
        })

        it('should display "No shares found" when album has no shares', async () => {
            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: {
                        data: {
                            album: {
                                id: 'album-1',
                                shares: [],
                                __typename: 'Album',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('No shares found')).toBeInTheDocument()
            })
        })
    })

    describe('Share Management', () => {
        it.each(
            [
                {
                    basename: '/',
                    initialEntry: '/album/album-1?sort=date#details',
                    sharePath: '/share',
                },
                {
                    basename: '/photoview',
                    initialEntry: '/photoview/album/album-1?sort=date#details',
                    sharePath: '/photoview/share',
                },
                {
                    basename: '/photoview/',
                    initialEntry: '/photoview/album/album-1?sort=date#details',
                    sharePath: '/photoview/share',
                },
                {
                    basename: '/photos/library/',
                    initialEntry: '/photos/library/album/album-1',
                    sharePath: '/photos/library/share',
                },
            ].flatMap(deployment => [
                { ...deployment, kind: 'album' as const },
                { ...deployment, kind: 'media' as const },
            ])
        )(
            'copies a $kind share under $basename',
            async ({ basename, initialEntry, sharePath, kind }) => {
                const user = userEvent.setup()
                const isAlbum = kind === 'album'
                const token = isAlbum ? 'ghi789' : 'abc123'

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: {
                            query: isAlbum
                                ? SHARE_ALBUM_QUERY
                                : SHARE_PHOTO_QUERY,
                            variables: {
                                id: isAlbum ? 'album-1' : 'photo-1',
                            },
                        },
                        result: {
                            data: isAlbum
                                ? mockAlbumShares
                                : mockPhotoShares,
                        },
                    },
                ]

                renderWithProviders(
                    isAlbum
                        ? <SidebarAlbumShare id="album-1" />
                        : <SidebarPhotoShare id="photo-1" />,
                    {
                        mocks,
                        basename,
                        initialEntries: [initialEntry],
                    }
                )

                const tokenElement = await screen.findByText(token)
                const row = tokenElement.closest('tr')!

                await user.click(
                    within(row).getByRole('button', { name: 'Copy Link' })
                )

                expect(copy).toHaveBeenCalledExactlyOnceWith(
                    `${location.origin}${sharePath}/${token}`
                )
            }
        )

        it('should delete a share', async () => {
            const user = userEvent.setup()

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
                {
                    request: {
                        query: DELETE_SHARE_MUTATION,
                        variables: { token: 'ghi789' },
                    },
                    result: {
                        data: {
                            deleteShareToken: {
                                token: 'ghi789',
                                __typename: 'ShareToken',
                            },
                        },
                    },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: {
                        data: {
                            album: {
                                id: 'album-1',
                                shares: [],
                                __typename: 'Album',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const deleteButton = screen.getByTitle('Delete')
            await user.click(deleteButton)

            await waitFor(() => {
                expect(screen.getByText('No shares found')).toBeInTheDocument()
            })
        })

        it.each([
            { outcome: 'resolved false', basename: '/', prefix: '' },
            { outcome: 'rejection', basename: '/', prefix: '' },
            {
                outcome: 'resolved false',
                basename: '/photoview/',
                prefix: '/photoview',
            },
            {
                outcome: 'rejection',
                basename: '/photoview/',
                prefix: '/photoview',
            },
        ] as const)(
            'logs $outcome under $basename without removing the share',
            async ({ outcome, basename, prefix }) => {
                const user = userEvent.setup()
                const consoleError = vi
                    .spyOn(console, 'error')
                    .mockImplementation(() => undefined)
                const clipboardError = new Error('Clipboard unavailable')

                if (outcome === 'resolved false') {
                    vi.mocked(copy).mockResolvedValueOnce(false)
                } else {
                    vi.mocked(copy).mockRejectedValueOnce(clipboardError)
                }

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: albumQueryRequest,
                        result: { data: mockAlbumShares },
                    },
                ]

                renderWithProviders(<SidebarAlbumShare id="album-1" />, {
                    mocks,
                    basename,
                    initialEntries: [`${prefix}/album/album-1`],
                })

                await screen.findByText('ghi789')
                await user.click(screen.getByRole('button', { name: 'Copy Link' }))

                await waitFor(() => {
                    if (outcome === 'resolved false') {
                        expect(consoleError).toHaveBeenCalledWith(
                            'Failed to copy share link'
                        )
                    } else {
                        expect(consoleError).toHaveBeenCalledWith(
                            'Failed to copy share link',
                            clipboardError
                        )
                    }
                })

                expect(copy).toHaveBeenCalledExactlyOnceWith(
                    `${location.origin}${prefix}/share/ghi789`
                )
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            }
        )

        it.each([
            { operation: 'add', failureType: 'network' },
            { operation: 'add', failureType: 'GraphQL' },
            { operation: 'delete', failureType: 'network' },
            { operation: 'delete', failureType: 'GraphQL' },
        ] as const)(
            'reports a $failureType share $operation failure without changing the shares',
            async ({ operation, failureType }) => {
                const user = userEvent.setup()
                const consoleError = vi
                    .spyOn(console, 'error')
                    .mockImplementation(() => undefined)
                const adding = operation === 'add'
                const message = `Share ${operation} failed`
                const notificationHeader = adding
                    ? 'Failed to add share'
                    : 'Failed to delete share'

                const mutationRequest = adding
                    ? {
                        query: ADD_ALBUM_SHARE_MUTATION,
                        variables: { id: 'album-1' },
                    }
                    : {
                        query: DELETE_SHARE_MUTATION,
                        variables: { token: 'ghi789' },
                    }

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: albumQueryRequest,
                        result: { data: mockAlbumShares },
                    },
                    {
                        request: mutationRequest,
                        ...(failureType === 'network'
                            ? { error: new Error(message) }
                            : {
                                result: {
                                    errors: [new GraphQLError(message)],
                                },
                            }),
                    },
                ]

                renderWithProviders(
                    <>
                        <SidebarAlbumShare id="album-1" />
                        <SharingNotifications />
                    </>,
                    { mocks }
                )

                await screen.findByText('ghi789')
                await user.click(
                    screen.getByRole('button', {
                        name: adding ? 'Add shares' : 'Delete',
                    })
                )

                // This proves that the configured operation failure was delivered.
                expect(
                    await screen.findByText(notificationHeader)
                ).toBeInTheDocument()
                expect(screen.getByRole('alert')).toHaveTextContent(message)
                expect(consoleError).toHaveBeenCalledWith(
                    notificationHeader,
                    expect.any(Error)
                )

                // Query the current DOM because add-share loading can remount it.
                expect(await screen.findByText('ghi789')).toBeInTheDocument()
                expect(screen.getByText('My Album Share')).toBeInTheDocument()
                expect(
                    screen.queryByText('No shares found')
                ).not.toBeInTheDocument()
                expect(
                    screen.getAllByRole('button', { name: 'Copy Link' })
                ).toHaveLength(1)
                expect(
                    screen.getByRole('button', { name: 'Add shares' })
                ).toBeEnabled()
                expect(
                    screen.getByRole('button', { name: 'Delete' })
                ).toBeEnabled()
            }
        )
    })

    describe('Share labels', () => {
        it('trims and saves a share label', async () => {
            const user = userEvent.setup()

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
                {
                    request: {
                        query: SET_SHARE_LABEL_MUTATION,
                        variables: {
                            token: 'ghi789',
                            label: 'Client album',
                        },
                    },
                    result: {
                        data: {
                            setShareTokenLabel: {
                                token: 'ghi789',
                                label: 'Client album',
                                __typename: 'ShareToken',
                            },
                        },
                    },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: {
                        data: {
                            album: {
                                id: 'album-1',
                                shares: [
                                    {
                                        ...mockAlbumShares.album.shares[0],
                                        label: 'Client album',
                                    },
                                ],
                                __typename: 'Album',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await screen.findByText('ghi789')
            await user.click(screen.getByTitle('More'))

            const labelInput = screen.getByLabelText('Share label')
            await user.clear(labelInput)
            await user.type(labelInput, '  Client album  ')
            await user.click(
                within(labelInput.parentElement!).getByRole('button', {
                    name: 'Submit',
                })
            )

            await waitFor(() => {
                expect(screen.getByText('Client album')).toBeInTheDocument()
            })
        })

        it('clears a share label when the input contains only whitespace', async () => {
            const user = userEvent.setup()

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
                {
                    request: {
                        query: SET_SHARE_LABEL_MUTATION,
                        variables: {
                            token: 'ghi789',
                            label: null,
                        },
                    },
                    result: {
                        data: {
                            setShareTokenLabel: {
                                token: 'ghi789',
                                label: null,
                                __typename: 'ShareToken',
                            },
                        },
                    },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: {
                        data: {
                            album: {
                                id: 'album-1',
                                shares: [
                                    {
                                        ...mockAlbumShares.album.shares[0],
                                        label: null,
                                    },
                                ],
                                __typename: 'Album',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await screen.findByText('ghi789')
            await user.click(screen.getByTitle('More'))

            const labelInput = screen.getByLabelText('Share label')
            await user.clear(labelInput)
            await user.type(labelInput, '   ')
            await user.click(
                within(labelInput.parentElement!).getByRole('button', {
                    name: 'Submit',
                })
            )

            await waitFor(() => {
                expect(screen.getByText('Public Link')).toBeInTheDocument()
            })
        })

        it('shows an inline error when a share-label update fails', async () => {
            const user = userEvent.setup()
            const consoleError = vi
                .spyOn(console, 'error')
                .mockImplementation(() => undefined)

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
                {
                    request: {
                        query: SET_SHARE_LABEL_MUTATION,
                        variables: {
                            token: 'ghi789',
                            label: 'Client album',
                        },
                    },
                    error: new Error('Label update failed'),
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await screen.findByText('ghi789')
            await user.click(screen.getByTitle('More'))

            const labelInput = screen.getByLabelText('Share label')
            await user.clear(labelInput)
            await user.type(labelInput, 'Client album')
            await user.click(
                within(labelInput.parentElement!).getByRole('button', {
                    name: 'Submit',
                })
            )

            await waitFor(() => {
                expect(
                    screen.getByText('Could not update share label')
                ).toBeInTheDocument()
                expect(consoleError).toHaveBeenCalledWith(
                    'Failed to update share label:',
                    expect.any(Error)
                )
            })
        })
    })

    describe('Password Protection', () => {
        it('enables password entry before saving protection', async () => {
            const user = userEvent.setup()
            const mocks: MockLink.MockedResponse[] = [
                {
                    request: albumQueryRequest,
                    result: { data: mockAlbumShares },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })
            await openAlbumShareOptions(user)

            const checkbox = screen.getByRole('checkbox', {
                name: 'Password protected',
            })
            const passwordInput = screen.getByTestId('share-password-input')

            expect(checkbox).not.toBeChecked()
            expect(passwordInput).toBeDisabled()

            await user.click(checkbox)

            expect(checkbox).toBeChecked()
            expect(passwordInput).toBeEnabled()
            expect(passwordInput).toHaveValue('')
        })

        it('should update password successfully', async () => {
            const user = userEvent.setup()

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
                {
                    request: {
                        query: PROTECT_SHARE_MUTATION,
                        variables: {
                            token: 'ghi789',
                            password: 'mypassword',
                        },
                    },
                    result: {
                        data: {
                            protectShareToken: {
                                token: 'ghi789',
                                hasPassword: true,
                                __typename: 'ShareToken',
                            },
                        },
                    },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: {
                        data: {
                            album: {
                                id: 'album-1',
                                shares: [
                                    {
                                        id: 'share-3',
                                        token: 'ghi789',
                                        label: null,
                                        hasPassword: true,
                                        expire: null,
                                        __typename: 'ShareToken',
                                    },
                                ],
                                __typename: 'Album',
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const moreButton = screen.getByTitle('More')
            await user.click(moreButton)

            await waitFor(() => {
                expect(screen.getByLabelText('Password protected')).toBeInTheDocument()
            })

            const checkbox = screen.getByLabelText('Password protected')
            await user.click(checkbox)

            const passwordInput = screen.getByTestId('share-password-input')
            await user.type(passwordInput, 'mypassword')
            await user.keyboard('{Enter}')

            await waitFor(() => {
                expect(passwordInput).toHaveValue('**********')
            })
        })

        it('should remove password protection', async () => {
            const user = userEvent.setup()

            const mockAlbumWithProtectedShare = {
                album: {
                    id: 'album-1',
                    shares: [
                        {
                            id: 'share-3',
                            token: 'ghi789',
                            label: null,
                            hasPassword: true,
                            expire: null,
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumWithProtectedShare },
                },
                {
                    request: {
                        query: PROTECT_SHARE_MUTATION,
                        variables: {
                            token: 'ghi789',
                            password: null,
                        },
                    },
                    result: {
                        data: {
                            protectShareToken: {
                                token: 'ghi789',
                                hasPassword: false,
                                expire: null,
                                __typename: 'ShareToken',
                            },
                        },
                    },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const moreButton = screen.getByTitle('More')
            await user.click(moreButton)

            await waitFor(() => {
                expect(screen.getByLabelText('Password protected')).toBeInTheDocument()
            })

            const checkbox = screen.getByLabelText('Password protected')
            expect(checkbox).toBeChecked()

            await user.click(checkbox)

            await waitFor(() => {
                expect(checkbox).not.toBeChecked()
            })
        })

        it.each([
            {
                operation: 'update',
                failureType: 'network',
            },
            {
                operation: 'update',
                failureType: 'GraphQL',
            },
            {
                operation: 'removal',
                failureType: 'network',
            },
            {
                operation: 'removal',
                failureType: 'GraphQL',
            },
        ] as const)(
            'reports a $failureType password $operation failure and preserves protection state',
            async ({ operation, failureType }) => {
                const user = userEvent.setup()
                const consoleError = vi
                    .spyOn(console, 'error')
                    .mockImplementation(() => undefined)
                const removing = operation === 'removal'
                const message = `Password ${operation} failed`
                const notificationHeader = removing
                    ? 'Failed to remove password protection'
                    : 'Failed to update password'
                const logPrefix = removing
                    ? 'Failed to remove password protection: '
                    : 'Failed to update password: '

                const initialData = {
                    album: {
                        ...mockAlbumShares.album,
                        shares: [
                            {
                                ...mockAlbumShares.album.shares[0],
                                hasPassword: removing,
                            },
                        ],
                    },
                }

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: albumQueryRequest,
                        result: { data: initialData },
                    },
                    {
                        request: {
                            query: PROTECT_SHARE_MUTATION,
                            variables: {
                                token: 'ghi789',
                                password: removing ? null : 'mypassword',
                            },
                        },
                        ...(failureType === 'network'
                            ? { error: new Error(message) }
                            : {
                                result: {
                                    errors: [new GraphQLError(message)],
                                },
                            }),
                    },
                ]

                renderWithProviders(
                    <>
                        <SidebarAlbumShare id="album-1" />
                        <SharingNotifications />
                    </>,
                    { mocks }
                )
                await openAlbumShareOptions(user)

                const checkbox = screen.getByRole('checkbox', {
                    name: 'Password protected',
                })

                if (removing) {
                    expect(checkbox).toBeChecked()
                    await user.click(checkbox)
                } else {
                    await user.click(checkbox)

                    const passwordInput = screen.getByTestId('share-password-input')
                    await user.type(passwordInput, 'mypassword')
                    await user.keyboard('{Enter}')
                }

                // Do not inspect unchanged state until the failure is delivered.
                expect(
                    await screen.findByText(notificationHeader)
                ).toBeInTheDocument()
                expect(screen.getByRole('alert')).toHaveTextContent(message)
                expect(consoleError).toHaveBeenCalledWith(
                    logPrefix,
                    expect.any(Error)
                )

                expect(checkbox).toBeChecked()
                expect(screen.getByTestId('share-password-input')).toHaveValue(
                    removing ? '**********' : 'mypassword'
                )
            }
        )

        it('should show hidden password as asterisks', async () => {
            const user = userEvent.setup()

            const mockAlbumWithProtectedShare = {
                album: {
                    id: 'album-1',
                    shares: [
                        {
                            id: 'share-3',
                            token: 'ghi789',
                            label: null,
                            hasPassword: true,
                            expire: null,
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumWithProtectedShare },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumWithProtectedShare },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const moreButton = screen.getByTitle('More')
            await user.click(moreButton)

            await waitFor(() => {
                expect(screen.getByLabelText('Password protected')).toBeInTheDocument()
            })

            const passwordInput = screen.getByDisplayValue('**********')
            expect(passwordInput).toHaveAttribute('type', 'password')
        })

        it('should reveal password field when typing', async () => {
            const user = userEvent.setup()

            const mockAlbumWithProtectedShare = {
                album: {
                    id: 'album-1',
                    shares: [
                        {
                            id: 'share-3',
                            token: 'ghi789',
                            label: null,
                            hasPassword: true,
                            expire: null,
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumWithProtectedShare },
                },
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumWithProtectedShare },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const moreButton = screen.getByTitle('More')
            await user.click(moreButton)

            await waitFor(() => {
                expect(screen.getByLabelText('Password protected')).toBeInTheDocument()
            })

            const passwordInput = screen.getByDisplayValue('**********')
            await user.click(passwordInput)
            await user.keyboard('a')

            await waitFor(() => {
                expect(passwordInput).toHaveValue('a')
            })
        })
    })

    describe('Expiration Date', () => {
        it('should show expiration date checkbox unchecked by default', async () => {
            const user = userEvent.setup()

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const moreButton = screen.getByTitle('More')
            await user.click(moreButton)

            await waitFor(() => {
                expect(screen.getByLabelText('Expiration date')).toBeInTheDocument()
            })

            const checkbox = screen.getByLabelText('Expiration date')
            expect(checkbox).not.toBeChecked()
        })

        it('should display existing expiration date as checked', async () => {
            const user = userEvent.setup()

            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 7)

            const mockAlbumWithExpiration = {
                album: {
                    id: 'album-1',
                    shares: [
                        {
                            id: 'share-3',
                            token: 'ghi789',
                            label: null,
                            hasPassword: false,
                            expire: futureDate.toISOString(),
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockLink.MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumWithExpiration },
                },
            ]

            renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })

            await waitFor(() => {
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            const moreButton = screen.getByTitle('More')
            await user.click(moreButton)

            await waitFor(() => {
                const checkbox = screen.getByLabelText('Expiration date')
                expect(checkbox).toBeChecked()
            })
        })

        describe('SidebarAlbumShare expiration changes', () => {
            it('enables expiration without saving a date immediately', async () => {
                const user = userEvent.setup()
                const mutationResult = vi.fn(() => ({
                    data: {
                        setExpireShareToken: {
                            token: 'ghi789',
                            __typename: 'ShareToken',
                        },
                    },
                }))

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: albumQueryRequest,
                        result: { data: mockAlbumShares },
                    },
                    {
                        request: {
                            query: SET_EXPIRE_MUTATION,
                            variables: {
                                token: 'ghi789',
                                expire: null,
                            },
                        },
                        result: mutationResult,
                    },
                ]

                renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })
                await openAlbumShareOptions(user)

                const checkbox = screen.getByRole('checkbox', {
                    name: 'Expiration date',
                })

                expect(checkbox).not.toBeChecked()

                await user.click(checkbox)

                expect(checkbox).toBeChecked()
                expect(mutationResult).not.toHaveBeenCalled()

                // A blank date must not be submitted.
                const expirationInput = screen.getByPlaceholderText('')
                await user.click(
                    within(expirationInput.parentElement!).getByRole('button', {
                        name: 'Submit',
                    })
                )

                expect(checkbox).toBeChecked()
                expect(mutationResult).not.toHaveBeenCalled()
            })

            it('clears an existing expiration and refetches the share', async () => {
                const user = userEvent.setup()
                const mutationResult = vi.fn(() => ({
                    data: {
                        setExpireShareToken: {
                            token: 'ghi789',
                            __typename: 'ShareToken',
                        },
                    },
                }))
                const refetchResult = vi.fn(() => ({
                    data: mockAlbumShares,
                }))

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: albumQueryRequest,
                        result: { data: mockAlbumWithExpiration },
                    },
                    {
                        request: {
                            query: SET_EXPIRE_MUTATION,
                            variables: {
                                token: 'ghi789',
                                expire: null,
                            },
                        },
                        result: mutationResult,
                    },
                    {
                        request: albumQueryRequest,
                        result: refetchResult,
                    },
                ]

                renderWithProviders(<SidebarAlbumShare id="album-1" />, { mocks })
                await openAlbumShareOptions(user)

                const checkbox = screen.getByRole('checkbox', {
                    name: 'Expiration date',
                })
                const expirationInput = screen.getByPlaceholderText(/2099/)

                expect(checkbox).toBeChecked()

                await user.click(checkbox)

                await waitFor(() => {
                    expect(mutationResult).toHaveBeenCalledOnce()
                    expect(refetchResult).toHaveBeenCalledOnce()
                    expect(checkbox).not.toBeChecked()
                })

                expect(expirationInput).not.toBeInTheDocument()
                expect(screen.getByText('ghi789')).toBeInTheDocument()
            })

            it.each(['network', 'GraphQL'] as const)(
                'restores the expiration and reports a %s failure when clearing fails',
                async failureType => {
                    const user = userEvent.setup()
                    const consoleError = vi
                        .spyOn(console, 'error')
                        .mockImplementation(() => undefined)
                    const message = 'Expiration clear failed'

                    const mocks: MockLink.MockedResponse[] = [
                        {
                            request: albumQueryRequest,
                            result: { data: mockAlbumWithExpiration },
                        },
                        {
                            request: {
                                query: SET_EXPIRE_MUTATION,
                                variables: {
                                    token: 'ghi789',
                                    expire: null,
                                },
                            },
                            ...(failureType === 'network'
                                ? { error: new Error(message) }
                                : {
                                    result: {
                                        errors: [new GraphQLError(message)],
                                    },
                                }),
                        },
                    ]

                    renderWithProviders(
                        <>
                            <SidebarAlbumShare id="album-1" />
                            <SharingNotifications />
                        </>,
                        { mocks }
                    )
                    await openAlbumShareOptions(user)

                    const checkbox = screen.getByRole('checkbox', {
                        name: 'Expiration date',
                    })
                    const previousDateValue =
                        screen.getByPlaceholderText<HTMLInputElement>(/2099/).value

                    await user.click(checkbox)

                    // This notification proves the failed operation completed.
                    expect(
                        await screen.findByText('Failed to clear expiration')
                    ).toBeInTheDocument()
                    expect(screen.getByRole('alert')).toHaveTextContent(message)

                    expect(checkbox).toBeChecked()
                    expect(screen.getByPlaceholderText(/2099/)).toHaveValue(
                        previousDateValue
                    )
                    expect(consoleError).toHaveBeenCalledWith(
                        'Failed to clear expiration',
                        expect.any(Error)
                    )
                }
            )

            it('saves an expiration date and retains it after reopening the options', async () => {
                const user = userEvent.setup()
                const savedExpire = '2099-07-15T23:59:59Z'
                const savedData = {
                    album: {
                        ...mockAlbumShares.album,
                        shares: [
                            {
                                ...mockAlbumShares.album.shares[0],
                                expire: savedExpire,
                            },
                        ],
                    },
                }
                const mutationResult = vi.fn(() => ({
                    data: {
                        setExpireShareToken: {
                            token: 'ghi789',
                            __typename: 'ShareToken',
                        },
                    },
                }))
                const refetchResult = vi.fn(() => ({
                    data: savedData,
                }))

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: albumQueryRequest,
                        result: { data: mockAlbumWithExpiration },
                    },
                    {
                        request: {
                            query: SET_EXPIRE_MUTATION,
                            variables: {
                                token: 'ghi789',
                                expire: savedExpire,
                            },
                        },
                        result: mutationResult,
                    },
                    {
                        request: albumQueryRequest,
                        result: refetchResult,
                    },
                ]

                renderWithProviders(
                    <>
                        <SidebarAlbumShare id="album-1" />
                        <SharingNotifications />
                    </>,
                    { mocks }
                )
                await openAlbumShareOptions(user)

                const input = screen.getByPlaceholderText(/2099/)
                const selected = await selectNextMonthExpiration(
                    user,
                    input,
                    new Date(mockAlbumWithExpiration.album.shares[0].expire)
                )

                expect(selected.expire).toBe(savedExpire)
                expect(input).toHaveValue(selected.displayValue)

                await user.click(
                    within(input.parentElement!).getByRole('button', {
                        name: 'Submit',
                    })
                )

                await waitFor(() => {
                    expect(mutationResult).toHaveBeenCalledOnce()
                    expect(refetchResult).toHaveBeenCalledOnce()
                })

                await screen.findByText('ghi789')

                // Read the current button because refetching can remount the controls.
                const moreButton = await screen.findByRole('button', {
                    name: 'More',
                })

                // Close the options explicitly if they remained open after refetching.
                // Escape is not reliable when keyboard focus is outside the popover.
                if (moreButton.getAttribute('aria-expanded') === 'true') {
                    await user.click(moreButton)
                }

                await waitFor(() => {
                    expect(
                        screen.getByRole('button', { name: 'More' })
                    ).toHaveAttribute('aria-expanded', 'false')
                })

                // Reopen from a confirmed closed state.
                await user.click(
                    screen.getByRole('button', { name: 'More' })
                )

                await waitFor(() => {
                    expect(
                        screen.getByRole('button', { name: 'More' })
                    ).toHaveAttribute('aria-expanded', 'true')
                })

                // Check the value returned by the backend, not the unsaved selection.
                const savedDisplayValue = formatExpirationDate(
                    new Date(savedExpire)
                )

                expect(
                    await screen.findByPlaceholderText(savedDisplayValue)
                ).toHaveValue(savedDisplayValue)
                expect(
                    screen.getByRole('checkbox', { name: 'Expiration date' })
                ).toBeChecked()
                expect(screen.queryByRole('alert')).not.toBeInTheDocument()
            })

            it.each([
                { previousExpiration: 'existing', failureType: 'network' },
                { previousExpiration: 'existing', failureType: 'GraphQL' },
                { previousExpiration: 'empty', failureType: 'network' },
                { previousExpiration: 'empty', failureType: 'GraphQL' },
            ] as const)(
                'restores an $previousExpiration expiration after a $failureType save failure',
                async ({ previousExpiration, failureType }) => {
                    const user = userEvent.setup()
                    const consoleError = vi
                        .spyOn(console, 'error')
                        .mockImplementation(() => undefined)
                    const hasPreviousExpiration = previousExpiration === 'existing'
                    const initialData = hasPreviousExpiration
                        ? mockAlbumWithExpiration
                        : mockAlbumShares
                    const calendarDate = hasPreviousExpiration
                        ? new Date(mockAlbumWithExpiration.album.shares[0].expire)
                        : new Date()
                    const selectedDate = new Date(
                        calendarDate.getFullYear(),
                        calendarDate.getMonth() + 1,
                        15,
                        12
                    )
                    const year = selectedDate.getFullYear()
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
                    const expire = `${year}-${month}-15T23:59:59Z`
                    const message = 'Expiration save failed'

                    const mocks: MockLink.MockedResponse[] = [
                        {
                            request: albumQueryRequest,
                            result: { data: initialData },
                        },
                        {
                            request: {
                                query: SET_EXPIRE_MUTATION,
                                variables: {
                                    token: 'ghi789',
                                    expire,
                                },
                            },
                            ...(failureType === 'network'
                                ? { error: new Error(message) }
                                : {
                                    result: {
                                        errors: [new GraphQLError(message)],
                                    },
                                }),
                        },
                    ]

                    renderWithProviders(
                        <>
                            <SidebarAlbumShare id="album-1" />
                            <SharingNotifications />
                        </>,
                        { mocks }
                    )
                    await openAlbumShareOptions(user)

                    const checkbox = screen.getByRole('checkbox', {
                        name: 'Expiration date',
                    })

                    if (!hasPreviousExpiration) {
                        await user.click(checkbox)
                    }

                    const input = hasPreviousExpiration
                        ? screen.getByPlaceholderText<HTMLInputElement>(/2099/)
                        : screen.getByPlaceholderText<HTMLInputElement>('')
                    const previousValue = input.value
                    const selected = await selectNextMonthExpiration(
                        user,
                        input,
                        calendarDate
                    )

                    expect(selected.expire).toBe(expire)
                    expect(input).toHaveValue(selected.displayValue)
                    expect(input.value).not.toBe(previousValue)

                    await user.click(
                        within(input.parentElement!).getByRole('button', {
                            name: 'Submit',
                        })
                    )

                    // Wait for the actual failure before checking restored state.
                    expect(
                        await screen.findByText('Failed to update expiration')
                    ).toBeInTheDocument()
                    expect(screen.getByRole('alert')).toHaveTextContent(message)

                    const restoredInput = hasPreviousExpiration
                        ? screen.getByPlaceholderText(/2099/)
                        : screen.getByPlaceholderText('')

                    expect(restoredInput).toHaveValue(previousValue)
                    expect(
                        screen.getByRole('checkbox', { name: 'Expiration date' })
                    ).toBeChecked()
                    expect(consoleError).toHaveBeenCalledWith(
                        'Failed to update expiration',
                        expect.any(Error)
                    )

                    // The action becomes available again after the failed save.
                    expect(
                        within(restoredInput.parentElement!).getByRole('button', {
                            name: 'Submit',
                        })
                    ).toBeEnabled()
                }
            )
        })

        describe('SidebarPhotoShare', () => {
            it('should show expiration date checkbox unchecked by default', async () => {
                const user = userEvent.setup()

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: {
                            query: SHARE_PHOTO_QUERY,
                            variables: { id: 'photo-1' },
                        },
                        result: { data: mockPhotoShares },
                    },
                ]

                renderWithProviders(<SidebarPhotoShare id="photo-1" />, { mocks })

                await waitFor(() => {
                    expect(screen.getByText('abc123')).toBeInTheDocument()
                })

                const moreButton = screen.getAllByTitle('More')[0]
                await user.click(moreButton)

                await waitFor(() => {
                    expect(screen.getByLabelText('Expiration date')).toBeInTheDocument()
                })

                const checkbox = screen.getByLabelText('Expiration date')
                expect(checkbox).not.toBeChecked()
            })

            it('should display existing expiration date as checked', async () => {
                const user = userEvent.setup()

                const futureDate = new Date()
                futureDate.setDate(futureDate.getDate() + 7)

                const mockPhotoWithExpiration = {
                    media: {
                        id: 'photo-1',
                        shares: [
                            {
                                id: 'share-1',
                                token: 'abc123',
                                label: null,
                                hasPassword: false,
                                expire: futureDate.toISOString(),
                                __typename: 'ShareToken',
                            },
                        ],
                        __typename: 'Media',
                    },
                }

                const mocks: MockLink.MockedResponse[] = [
                    {
                        request: {
                            query: SHARE_PHOTO_QUERY,
                            variables: { id: 'photo-1' },
                        },
                        result: { data: mockPhotoWithExpiration },
                    },
                ]

                renderWithProviders(<SidebarPhotoShare id="photo-1" />, { mocks })

                await waitFor(() => {
                    expect(screen.getByText('abc123')).toBeInTheDocument()
                })

                const moreButton = screen.getAllByTitle('More')[0]
                await user.click(moreButton)

                await waitFor(() => {
                    const checkbox = screen.getByLabelText('Expiration date')
                    expect(checkbox).toBeChecked()
                })
            })
        })
    })
})
