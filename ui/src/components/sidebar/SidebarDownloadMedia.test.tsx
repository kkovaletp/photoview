import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import SidebarMediaDownload, { SIDEBAR_DOWNLOAD_QUERY } from './SidebarDownloadMedia'
import { MediaSidebarMedia } from './MediaSidebar/MediaSidebar'
import { MediaType, NotificationType } from '../../__generated__/globalTypes'
import { renderWithProviders } from '../../helpers/testUtils'
import * as authentication from '../../helpers/authentication'
import * as messageState from '../messages/MessageState'
import { sidebarDownloadQuery_media_downloads } from './__generated__/sidebarDownloadQuery'

// Mock dependencies
vi.mock('../../helpers/authentication')
const authToken = vi.mocked(authentication.authToken)

// Mock MessageState
vi.mock('../messages/MessageState')
const useMessageState = vi.mocked(messageState.useMessageState)

// Mock global fetch for download tests
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock URL methods for download blob handling
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('SidebarMediaDownload', () => {
    const mockMedia: MediaSidebarMedia = {
        __typename: 'Media',
        id: 'media-123',
        title: 'test-photo.jpg',
        type: MediaType.Photo,
        thumbnail: {
            __typename: 'MediaURL',
            url: '/thumbnail.jpg',
            width: 200,
            height: 150,
        },
        highRes: null,
        videoWeb: null,
    }

    const mockDownloads: sidebarDownloadQuery_media_downloads[] = [
        {
            __typename: 'MediaDownload',
            title: 'Original',
            mediaUrl: {
                __typename: 'MediaURL',
                url: '/photo/original.jpg',
                width: 4000,
                height: 3000,
                fileSize: 2500000,
            },
        },
        {
            __typename: 'MediaDownload',
            title: 'Thumbnail',
            mediaUrl: {
                __typename: 'MediaURL',
                url: '/photo/thumbnail.jpg',
                width: 400,
                height: 300,
                fileSize: 50000,
            },
        },
    ]

    let mockAdd: ReturnType<typeof vi.fn>
    let mockRemoveKey: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()
        authToken.mockReturnValue('test-token')

        // Setup MessageState mock
        mockAdd = vi.fn()
        mockRemoveKey = vi.fn()
        useMessageState.mockReturnValue({
            add: mockAdd,
            removeKey: mockRemoveKey,
            messages: [],
            setMessages: vi.fn(),
        })
    })

    describe('Query States', () => {
        it('should not trigger query when media has downloads prop', () => {
            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: mockDownloads,
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            expect(screen.getByText('Original')).toBeInTheDocument()
            expect(screen.getByText('Thumbnail')).toBeInTheDocument()
        })

        it('should trigger query when media has no downloads', async () => {
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: SIDEBAR_DOWNLOAD_QUERY,
                        variables: { mediaId: 'media-123' },
                    },
                    result: {
                        data: {
                            media: {
                                __typename: 'Media',
                                id: 'media-123',
                                downloads: mockDownloads,
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarMediaDownload media={mockMedia} />, {
                mocks,
            })

            await waitFor(() => {
                expect(screen.getByText('Original')).toBeInTheDocument()
            })

            expect(screen.getByText('Thumbnail')).toBeInTheDocument()
        })

        it('should display error when query fails', async () => {
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: SIDEBAR_DOWNLOAD_QUERY,
                        variables: { mediaId: 'media-123' },
                    },
                    result: {
                        errors: [new GraphQLError('Failed to load downloads')],
                    },
                },
            ]

            renderWithProviders(<SidebarMediaDownload media={mockMedia} />, {
                mocks,
            })

            await waitFor(() => {
                expect(screen.getByText(/Failed to load download options/i)).toBeInTheDocument()
            })

            expect(screen.getByText(/Failed to load downloads/i)).toBeInTheDocument()
        })

        it('should return null when media is null', () => {
            const { container } = renderWithProviders(
                <SidebarMediaDownload media={null as any} />,
                { mocks: [] }
            )

            expect(container.firstChild).toBeNull()
        })

        it('should return null when media has no id', () => {
            const mediaWithoutId = { ...mockMedia, id: '' }
            const { container } = renderWithProviders(
                <SidebarMediaDownload media={mediaWithoutId as any} />,
                { mocks: [] }
            )

            expect(container.firstChild).toBeNull()
        })
    })

    describe('Download Table Rendering', () => {
        it('should display download options with correct formatting', async () => {
            const mocks: MockedResponse[] = [
                {
                    request: {
                        query: SIDEBAR_DOWNLOAD_QUERY,
                        variables: { mediaId: 'media-123' },
                    },
                    result: {
                        data: {
                            media: {
                                __typename: 'Media',
                                id: 'media-123',
                                downloads: mockDownloads,
                            },
                        },
                    },
                },
            ]

            renderWithProviders(<SidebarMediaDownload media={mockMedia} />, {
                mocks,
            })

            await waitFor(() => {
                expect(screen.getByText('Original')).toBeInTheDocument()
            })

            // Check dimensions
            expect(screen.getByText('4000 x 3000')).toBeInTheDocument()
            expect(screen.getByText('400 x 300')).toBeInTheDocument()

            // Check file sizes (formatted)
            expect(screen.getByText('2 MB')).toBeInTheDocument()
            expect(screen.getByText('49 KB')).toBeInTheDocument()

            // Check file extensions
            expect(screen.getAllByText('jpg')).toHaveLength(2)
        })

        it('should render table headers correctly', () => {
            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: mockDownloads,
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            expect(screen.getByText('Name')).toBeInTheDocument()
            expect(screen.getByText('Dimensions')).toBeInTheDocument()
            expect(screen.getByText('Size')).toBeInTheDocument()
            expect(screen.getByText('Type')).toBeInTheDocument()
        })
    })

    describe('Download Interactions', () => {
        it('should handle download with content-length header (progress mode)', async () => {
            const user = userEvent.setup()
            authToken.mockReturnValue('test-token')

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Map([
                    ['content-length', '1000'],
                    ['content-type', 'image/jpeg'],
                ]),
                body: {
                    getReader: () => ({
                        read: vi.fn()
                            .mockResolvedValueOnce({
                                done: false,
                                value: new Uint8Array(1000),
                            })
                            .mockResolvedValueOnce({ done: true }),
                        cancel: vi.fn(),
                    }),
                },
            } as any)

            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: [mockDownloads[0]],
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            const downloadRow = screen.getByText('Original').closest('tr')
            expect(downloadRow).toBeInTheDocument()

            await user.click(downloadRow!)

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled()
            })

            // Verify progress notification was added
            await waitFor(() => {
                expect(mockAdd).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: NotificationType.Progress,
                        props: expect.objectContaining({
                            header: 'Downloading media',
                        }),
                    })
                )
            })

            // Verify completion notification
            await waitFor(() => {
                const completionCalls = mockAdd.mock.calls.filter(
                    call => call[0].props.header === 'Downloading media completed'
                )
                expect(completionCalls.length).toBeGreaterThan(0)
            })
        })

        it('should handle download without content-length header (direct mode)', async () => {
            const user = userEvent.setup()
            authToken.mockReturnValue('test-token')

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Map([['content-type', 'image/jpeg']]),
                blob: async () => new Blob(['test'], { type: 'image/jpeg' }),
            } as any)

            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: [mockDownloads[0]],
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            const downloadRow = screen.getByText('Original').closest('tr')
            await user.click(downloadRow!)

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled()
            })

            const fetchCall = mockFetch.mock.calls[0][0]
            expect(fetchCall).toContain('/photo/original.jpg')

            // Should not show progress notifications for direct download
            expect(mockAdd).not.toHaveBeenCalled()
        })

        it('should fail when content-length is 0 bytes', async () => {
            const user = userEvent.setup()
            authToken.mockReturnValue('test-token')

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Map([
                    ['content-length', '0'],
                    ['content-type', 'image/jpeg'],
                ]),
                body: {
                    getReader: () => ({
                        read: vi.fn().mockResolvedValue({ done: true }),
                        cancel: vi.fn(),
                    }),
                },
            } as any)

            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: [mockDownloads[0]],
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            const downloadRow = screen.getByText('Original').closest('tr')
            await user.click(downloadRow!)

            await waitFor(() => {
                expect(mockAdd).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: NotificationType.Close,
                        props: expect.objectContaining({
                            negative: true,
                            header: 'Downloading media failed',
                        }),
                    })
                )
            })

            // Verify error message mentions 0 bytes
            const errorCall = mockAdd.mock.calls.find(
                call => call[0].props?.header === 'Downloading media failed'
            )
            expect(errorCall).toBeDefined()
            expect(errorCall![0].props.content).toMatch(/0 bytes/i)
        })

        it('should fail when receiving more data than expected', async () => {
            const user = userEvent.setup()
            authToken.mockReturnValue('test-token')

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Map([
                    ['content-length', '100'],
                    ['content-type', 'image/jpeg'],
                ]),
                body: {
                    getReader: () => ({
                        read: vi.fn()
                            .mockResolvedValueOnce({
                                done: false,
                                value: new Uint8Array(150), // More than expected
                            })
                            .mockResolvedValueOnce({ done: true }),
                        cancel: vi.fn(),
                    }),
                },
            } as any)

            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: [mockDownloads[0]],
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            const downloadRow = screen.getByText('Original').closest('tr')
            await user.click(downloadRow!)

            await waitFor(() => {
                expect(mockAdd).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: NotificationType.Close,
                        props: expect.objectContaining({
                            negative: true,
                            header: 'Downloading media failed',
                        }),
                    })
                )
            })

            // Verify error message mentions exceeding data
            const errorCall = mockAdd.mock.calls.find(
                call => call[0].props?.header === 'Downloading media failed'
            )
            expect(errorCall).toBeDefined()
            expect(errorCall![0].props.content).toMatch(/more data than expected/i)
        })

        it('should handle general download errors', async () => {
            const user = userEvent.setup()
            authToken.mockReturnValue('test-token')

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Map([
                    ['content-length', '1000'],
                    ['content-type', 'image/jpeg'],
                ]),
                body: {
                    getReader: () => ({
                        read: vi.fn().mockRejectedValue(new Error('Network error')),
                        cancel: vi.fn(),
                    }),
                },
            } as any)

            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: [mockDownloads[0]],
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            const downloadRow = screen.getByText('Original').closest('tr')
            await user.click(downloadRow!)

            await waitFor(() => {
                expect(mockAdd).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: NotificationType.Close,
                        props: expect.objectContaining({
                            negative: true,
                            header: 'Downloading media failed',
                        }),
                    })
                )
            })

            // Verify error message contains the network error
            const errorCall = mockAdd.mock.calls.find(
                call => call[0].props?.header === 'Downloading media failed'
            )
            expect(errorCall).toBeDefined()
            expect(errorCall![0].props.content).toMatch(/Network error/i)
        })

        it('should add share token to URL for unauthenticated user', async () => {
            const user = userEvent.setup()
            authToken.mockReturnValue(null)

            // Store original location
            const originalLocation = window.location

            // Mock window.location properly
            delete (window as any).location
                ; (window as any).location = {
                    ...originalLocation,
                    pathname: '/share/share-token-123/photo',
                    origin: 'http://localhost:3000',
                }

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Map([['content-type', 'image/jpeg']]),
                blob: async () => new Blob(['test'], { type: 'image/jpeg' }),
            } as any)

            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: [mockDownloads[0]],
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            const downloadRow = screen.getByText('Original').closest('tr')
            await user.click(downloadRow!)

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled()
            })

            const fetchCall = mockFetch.mock.calls[0][0]
            expect(fetchCall).toContain('token=share-token-123')

                // Restore original location
                ; (window as any).location = originalLocation
        })
    })

    describe('Byte Formatting', () => {
        it('should format bytes correctly for different sizes', () => {
            const mediaWithDownloads: MediaSidebarMedia = {
                ...mockMedia,
                downloads: [
                    {
                        __typename: 'MediaDownload',
                        title: 'Test',
                        mediaUrl: {
                            __typename: 'MediaURL',
                            url: '/test.jpg',
                            width: 100,
                            height: 100,
                            fileSize: 1024,
                        },
                    },
                ],
            }

            renderWithProviders(<SidebarMediaDownload media={mediaWithDownloads} />, {
                mocks: [],
            })

            expect(screen.getByText('1 KB')).toBeInTheDocument()
        })
    })
})
