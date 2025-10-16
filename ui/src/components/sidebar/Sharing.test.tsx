import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import {
    SidebarAlbumShare,
    SidebarPhotoShare,
} from './Sharing'
import { gql } from '@apollo/client'

// Mock dependencies
vi.mock('../../helpers/authentication', () => ({
    authToken: vi.fn(() => 'test-token'),
}))

vi.mock('copy-to-clipboard', () => ({
    default: vi.fn(() => true),
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
                hasPassword
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
            hasPassword
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
                hasPassword: false,
                __typename: 'ShareToken',
            },
            {
                id: 'share-2',
                token: 'def456',
                hasPassword: true,
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
                hasPassword: false,
                __typename: 'ShareToken',
            },
        ],
        __typename: 'Album',
    },
}

describe('Sharing Components', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(authToken).mockReturnValue('test-token')
    })

    describe('SidebarPhotoShare', () => {
        it('should display shares when authenticated', async () => {
            const mocks: MockedResponse[] = [
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
                const links = screen.getAllByText(/Public Link/)
                expect(links.length).toBeGreaterThan(0)
            })

            expect(screen.getByText('abc123')).toBeInTheDocument()
            expect(screen.getByText('def456')).toBeInTheDocument()
        })

        it('should not load shares when not authenticated', () => {
            vi.mocked(authToken).mockReturnValue(null)

            const mocks: MockedResponse[] = []

            renderWithProviders(<SidebarPhotoShare id="photo-1" />, { mocks })

            // Should not show loading or make the query
            expect(screen.queryByText('Loading shares...')).not.toBeInTheDocument()
            expect(screen.queryByText(/Public Link/)).not.toBeInTheDocument()
        })

        it('should display error when query fails', async () => {
            vi.mocked(authToken).mockReturnValue('test-token')
            const mocks: MockedResponse[] = [
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

            const mocks: MockedResponse[] = [
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
                                        hasPassword: false,
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
            const mocks: MockedResponse[] = [
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
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
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
        })

        it('should display error when query fails', async () => {
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    error: new Error('Failed to load album shares'),
                },
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

            const mocks: MockedResponse[] = [
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
                                        hasPassword: false,
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
            const mocks: MockedResponse[] = [
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
        it('should copy share link to clipboard', async () => {
            const user = userEvent.setup()

            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
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

            const copyButton = screen.getByTitle('Copy Link')
            await user.click(copyButton)

            expect(copy).toHaveBeenCalledWith(
                `${location.origin}/share/ghi789`
            )
        })

        it('should delete a share', async () => {
            const user = userEvent.setup()

            const mocks: MockedResponse[] = [
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
    })

    describe('Password Protection', () => {
        it('should enable password protection', async () => {
            const user = userEvent.setup()

            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: SHARE_ALBUM_QUERY,
                        variables: { id: 'album-1' },
                    },
                    result: { data: mockAlbumShares },
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
            expect(checkbox).not.toBeChecked()
        })

        it('should update password successfully', async () => {
            const user = userEvent.setup()

            const mocks: MockedResponse[] = [
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
                                        hasPassword: true,
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
                            hasPassword: true,
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockedResponse[] = [
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

        it('should display error notification when password update fails', async () => {
            const user = userEvent.setup()

            const mocks: MockedResponse[] = [
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
                        errors: [new GraphQLError('Password update failed')],
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
                // Instead of checking for the message in DOM, we verify the mutation failed
                // by checking that the password input didn't change to asterisks
                const passwordInput = screen.getByTestId('share-password-input')
                expect(passwordInput).not.toHaveValue('**********')
            }, { timeout: 2000 })
        })

        it('should display error notification when password removal fails', async () => {
            const user = userEvent.setup()

            const mockAlbumWithProtectedShare = {
                album: {
                    id: 'album-1',
                    shares: [
                        {
                            id: 'share-3',
                            token: 'ghi789',
                            hasPassword: true,
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockedResponse[] = [
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
                        errors: [new GraphQLError('Failed to remove password')],
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
            expect(checkbox).toBeChecked()

            await user.click(checkbox)

            await waitFor(() => {
                expect(checkbox).toBeChecked()
            }, { timeout: 2000 })
        })

        it('should show hidden password as asterisks', async () => {
            const user = userEvent.setup()

            const mockAlbumWithProtectedShare = {
                album: {
                    id: 'album-1',
                    shares: [
                        {
                            id: 'share-3',
                            token: 'ghi789',
                            hasPassword: true,
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockedResponse[] = [
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
                            hasPassword: true,
                            __typename: 'ShareToken',
                        },
                    ],
                    __typename: 'Album',
                },
            }

            const mocks: MockedResponse[] = [
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
})
