import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { renderWithProviders } from '../../helpers/testUtils'
import SidebarMediaDownload from './SidebarDownloadMedia'
import { NotificationType, MediaType } from '../../__generated__/globalTypes'
import { MediaSidebarMedia } from './MediaSidebar/MediaSidebar'

vi.mock('../../helpers/authentication', () => ({
    authToken: vi.fn().mockReturnValue(null)
}))

const mockMedia: MediaSidebarMedia = {
    __typename: 'Media' as const,
    id: '1',
    title: 'Test Image',
    type: MediaType.Photo,
    highRes: {
        __typename: 'MediaURL' as const,
        url: '/high-res.jpg',
        width: 1920,
        height: 1080
    },
    thumbnail: {
        __typename: 'MediaURL' as const,
        url: '/thumbnail.jpg',
        width: 300,
        height: 169
    },
    downloads: [
        {
            __typename: 'MediaDownload' as const,
            title: 'Original',
            mediaUrl: {
                __typename: 'MediaURL' as const,
                url: '/photo-1.jpg',
                width: 1920,
                height: 1080,
                fileSize: 1024000
            }
        }
    ]
}

describe('SidebarMediaDownload', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { })

        const mockAnchor = {
            href: '',
            download: '',
            click: vi.fn(),
            remove: vi.fn()
        } as unknown as HTMLAnchorElement

        vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor)
        vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node as Node)
    })

    it('renders download table with media information', () => {
        renderWithProviders(<SidebarMediaDownload media={mockMedia} />, { mocks: [] })

        expect(screen.getByText('Original')).toBeInTheDocument()
        expect(screen.getByText('1920 x 1080')).toBeInTheDocument()
        expect(screen.getByText('1000 KB')).toBeInTheDocument()
        expect(screen.getByText('jpg')).toBeInTheDocument()
    })

    it('shows progress when downloading media with content-length header', async () => {
        const mockReadableStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]))
                controller.enqueue(new Uint8Array([4, 5, 6]))
                controller.close()
            }
        })

        const mockResponse = new Response(mockReadableStream, {
            headers: new Headers({
                'content-length': '6',
                'content-type': 'image/jpeg'
            })
        })

        global.fetch = vi.fn().mockResolvedValue(mockResponse)

        renderWithProviders(<SidebarMediaDownload media={mockMedia} />, { mocks: [] })

        await userEvent.click(screen.getByText('Original'))

        await waitFor(() => {
            expect(screen.getByText('Downloading media')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText('Downloading media completed')).toBeInTheDocument()
        })
    })

    it('handles download failure when content length is 0', async () => {
        const mockResponse = new Response(new Blob([]), {
            headers: new Headers({
                'content-length': '0',
                'content-type': 'image/jpeg'
            })
        })

        global.fetch = vi.fn().mockResolvedValue(mockResponse)

        renderWithProviders(<SidebarMediaDownload media={mockMedia} />, { mocks: [] })

        await userEvent.click(screen.getByText('Original'))

        await waitFor(() => {
            expect(screen.getByText('Downloading media failed')).toBeInTheDocument()
            // Verify exact error message
            expect(screen.getByText(/The content length of the downloaded media is 0 bytes/i)).toBeInTheDocument()
            expect(screen.getByText(/usually means that there is an unknown lower-level error/i)).toBeInTheDocument()
        })
    })

    it('handles network errors during download', async () => {
        const networkError = new Error('Failed to fetch: Network error')
        global.fetch = vi.fn().mockRejectedValue(networkError)

        renderWithProviders(<SidebarMediaDownload media={mockMedia} />, { mocks: [] })

        await userEvent.click(screen.getByText('Original'))

        await waitFor(() => {
            expect(screen.getByText('Downloading media failed')).toBeInTheDocument()
            expect(screen.getByText(networkError.message)).toBeInTheDocument()
        })
    })

    it('handles user cancellation of download', async () => {
        let readerController: ReadableStreamDefaultController<Uint8Array> | null = null
        const mockReadableStream = new ReadableStream<Uint8Array>({
            start(controller) {
                readerController = controller
                // Send initial chunk
                controller.enqueue(new Uint8Array([1, 2, 3]))
            }
        })

        const mockResponse = new Response(mockReadableStream, {
            headers: new Headers({
                'content-length': '6',
                'content-type': 'image/jpeg'
            })
        })

        global.fetch = vi.fn().mockResolvedValue(mockResponse)

        renderWithProviders(<SidebarMediaDownload media={mockMedia} />, { mocks: [] })

        await userEvent.click(screen.getByText('Original'))

        await waitFor(() => {
            expect(screen.getByText('Downloading media')).toBeInTheDocument()
        })

        // Click the close button on the notification
        const closeButton = screen.getByRole('button', { name: /close/i })
        await userEvent.click(closeButton)

        // Verify the download was canceled
        expect(screen.queryByText('Downloading media')).not.toBeInTheDocument()
        expect(screen.queryByText('Downloading media completed')).not.toBeInTheDocument()
    })

    it('handles invalid response data during download', async () => {
        const mockReadableStream = new ReadableStream({
            start(controller) {
                // Send more data than content-length indicates
                controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
                controller.close()
            }
        })

        const mockResponse = new Response(mockReadableStream, {
            headers: new Headers({
                'content-length': '3',
                'content-type': 'image/jpeg'
            })
        })

        global.fetch = vi.fn().mockResolvedValue(mockResponse)

        renderWithProviders(<SidebarMediaDownload media={mockMedia} />, { mocks: [] })

        await userEvent.click(screen.getByText('Original'))

        await waitFor(() => {
            expect(screen.getByText('Downloading media failed')).toBeInTheDocument()
            expect(screen.getByText(/Received more data than expected/)).toBeInTheDocument()
        })
    })

    it('downloads media without progress when content-length header is missing', async () => {
        const mockResponse = new Response(new Blob(['test data']), {
            headers: new Headers({
                'content-type': 'image/jpeg'
            })
        })

        global.fetch = vi.fn().mockResolvedValue(mockResponse)

        renderWithProviders(<SidebarMediaDownload media={mockMedia} />, { mocks: [] })

        await userEvent.click(screen.getByText('Original'))

        // Verify download completed without showing progress
        expect(screen.queryByText('Downloading media')).not.toBeInTheDocument()
    })
})
