import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import SidebarMediaDownload, { SIDEBAR_DOWNLOAD_QUERY } from './SidebarDownloadMedia'
import { MediaSidebarMedia } from './MediaSidebar/MediaSidebar'
import { MediaType } from '../../__generated__/globalTypes'
import { renderWithProviders } from '../../helpers/testUtils'
import * as authentication from '../../helpers/authentication'
import { sidebarDownloadQuery_media_downloads } from './__generated__/sidebarDownloadQuery'

// Mock dependencies
vi.mock('../../helpers/authentication')
const authToken = vi.mocked(authentication.authToken)

// Mock global fetch for download tests
const originalFetch = global.fetch as any
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock URL methods for download blob handling
const originalCreateObjectURL = global.URL.createObjectURL
const originalRevokeObjectURL = global.URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()
const originalCreateElement = document.createElement.bind(document)
const mockCreateElement = vi.fn((tagName: string) => {
    if (tagName === 'a') {
        const anchor = originalCreateElement('a') as HTMLAnchorElement
        anchor.click = vi.fn() // Mock click to prevent jsdom navigation
        return anchor
    }
    return originalCreateElement(tagName)
})
document.createElement = mockCreateElement as any

afterAll(() => {
    global.fetch = originalFetch
    global.URL.createObjectURL = originalCreateObjectURL
    global.URL.revokeObjectURL = originalRevokeObjectURL
    document.createElement = originalCreateElement
})

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

    beforeEach(() => {
        vi.clearAllMocks()
        authToken.mockReturnValue('test-token')
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
                headers: new Headers([
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

            // Verify fetch was called with correct URL
            const fetchCall = mockFetch.mock.calls[0][0]
            expect(fetchCall).toContain('/photo/original.jpg')
        })

        it('should handle download without content-length header (direct mode)', async () => {
            const user = userEvent.setup()
            authToken.mockReturnValue('test-token')

            mockFetch.mockResolvedValue({
                ok: true,
                headers: new Headers([['content-type', 'image/jpeg']]),
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

            // Verify blob URL created and revoked
            await waitFor(() => {
                expect(global.URL.createObjectURL).toHaveBeenCalled()
            })
            expect(global.URL.revokeObjectURL).toHaveBeenCalled()
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
