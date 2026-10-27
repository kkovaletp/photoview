import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockLink } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import SidebarMediaDownload, { SIDEBAR_DOWNLOAD_QUERY } from './SidebarDownloadMedia'
import { MediaSidebarMedia } from './MediaSidebar/MediaSidebar'
import { MediaType } from '../../__generated__/globalTypes'
import { renderWithProviders } from '../../helpers/testUtils'
import * as authentication from '../../helpers/authentication'
import { SidebarDownloadQueryQuery } from './__generated__/SidebarDownloadMedia'
import { useMessageState } from '../messages/MessageState'

// Mock dependencies
vi.mock('../../helpers/authentication')
const authToken = vi.mocked(authentication.authToken)

// Mock global fetch for download tests
const originalFetch = globalThis.fetch as any
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock URL methods for download blob handling
const originalCreateObjectURL = globalThis.URL.createObjectURL
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(
  (_blob: Blob | MediaSource) => 'blob:mock-url'
)
const mockRevokeObjectURL = vi.fn()

globalThis.URL.createObjectURL = mockCreateObjectURL
globalThis.URL.revokeObjectURL = mockRevokeObjectURL
const originalCreateElement = document.createElement.bind(document)
const anchorClickMocks = new WeakMap<
  HTMLAnchorElement,
  ReturnType<typeof vi.fn>
>()

const mockCreateElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    const anchor = originalCreateElement('a')
    const clickMock = vi.fn()

    anchor.click = clickMock
    anchorClickMocks.set(anchor, clickMock)

    return anchor
  }
  return originalCreateElement(tagName)
})
document.createElement = mockCreateElement as any

afterAll(() => {
  globalThis.fetch = originalFetch
  globalThis.URL.createObjectURL = originalCreateObjectURL
  globalThis.URL.revokeObjectURL = originalRevokeObjectURL
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

  const mockDownloads: SidebarDownloadQueryQuery['media']['downloads'] = [
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
    mockFetch.mockReset()
    authToken.mockReturnValue('test-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
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
      const mocks: MockLink.MockedResponse[] = [
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
      const mocks: MockLink.MockedResponse[] = [
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
      const mocks: MockLink.MockedResponse[] = [
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
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('shows an error when the download request rejects', async () => {
      const user = userEvent.setup()
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })
      mockFetch.mockRejectedValueOnce(new Error('Network unavailable'))

      const DownloadErrorMessage = () => {
        const { messages } = useMessageState()
        return (
          <>
            {messages.map(message => (
              <p key={message.key}>{message.props.content}</p>
            ))}
          </>
        )
      }

      try {
        renderWithProviders(
          <>
            <SidebarMediaDownload
              media={{ ...mockMedia, downloads: [mockDownloads[0]] }}
            />
            <DownloadErrorMessage />
          </>,
          { mocks: [] }
        )

        await user.click(screen.getByText('Original').closest('tr')!)

        expect(
          await screen.findByText(
            'The media download task failed with the error: Network unavailable'
          )
        ).toBeInTheDocument()
        expect(mockCreateObjectURL).not.toHaveBeenCalled()
      } finally {
        consoleError.mockRestore()
      }
    })

    describe.each(['/', '/photoview/'])(
      'download URLs with BASE_URL=%s',
      baseUrl => {
        describe.each([undefined, 'test-token'])(
          'with account token %s',
          accountToken => {
            it.each([
              {
                name: 'root-relative API URL',
                route: '/share/abc123',
                mediaUrl: '/api/photo/original.jpg',
                expectedUrl:
                  `${location.origin}/api/photo/original.jpg?token=abc123`,
              },
              {
                name: 'API URL that already contains the prefix',
                route: '/share/abc123',
                mediaUrl: '/photoview/api/photo/original.jpg',
                expectedUrl:
                  `${location.origin}/photoview/api/photo/original.jpg?token=abc123`,
              },
              {
                name: 'absolute API URL',
                route: '/share/abc123',
                mediaUrl:
                  'https://media.example/api/photo/original.jpg',
                expectedUrl:
                  'https://media.example/api/photo/original.jpg?token=abc123',
              },
              {
                name: 'subalbum URL with an existing query and token',
                route: '/share/abc123/subalbum-1',
                mediaUrl:
                  '/api/photo/original.jpg?size=full&token=old-token',
                expectedUrl:
                  `${location.origin}/api/photo/original.jpg?size=full&token=abc123`,
              },
              {
                name: 'ordinary album without a share token',
                route: '/album/album-1',
                mediaUrl: '/api/photo/original.jpg?size=full',
                expectedUrl:
                  `${location.origin}/api/photo/original.jpg?size=full`,
              },
              {
                name: 'ordinary album preserves the backend query',
                route: '/album/album-1',
                mediaUrl:
                  '/api/photo/original.jpg?size=full&token=backend-token',
                expectedUrl:
                  `${location.origin}/api/photo/original.jpg?size=full&token=backend-token`,
              },
            ])(
              '$name',
              async ({ route, mediaUrl, expectedUrl }) => {
                vi.stubEnv('BASE_URL', baseUrl)
                authToken.mockReturnValue(accountToken)

                const user = userEvent.setup()
                const blob = new Blob(['test'], {
                  type: 'image/jpeg',
                })

                mockFetch.mockResolvedValueOnce({
                  ok: true,
                  status: 200,
                  headers: new Headers({
                    'content-type': 'image/jpeg',
                  }),
                  blob: vi.fn().mockResolvedValue(blob),
                })

                const download = {
                  ...mockDownloads[0],
                  mediaUrl: {
                    ...mockDownloads[0].mediaUrl,
                    url: mediaUrl,
                  },
                }

                renderWithProviders(
                  <SidebarMediaDownload
                    media={{
                      ...mockMedia,
                      downloads: [download],
                    }}
                  />,
                  {
                    mocks: [],
                    basename: baseUrl,
                    initialEntries: [
                      `${baseUrl}${route.slice(1)}`,
                    ],
                  }
                )

                await user.click(
                  screen.getByText('Original').closest('tr')!
                )

                await waitFor(() => {
                  expect(mockRevokeObjectURL)
                    .toHaveBeenCalledWith('blob:mock-url')
                })

                expect(mockFetch).toHaveBeenCalledExactlyOnceWith(
                  expectedUrl,
                  { credentials: 'include' }
                )

                expect(mockCreateObjectURL)
                  .toHaveBeenCalledExactlyOnceWith(blob)

                const downloadAnchors =
                  mockCreateElement.mock.results.flatMap(result => {
                    if (
                      result.type === 'return' &&
                      result.value instanceof HTMLAnchorElement &&
                      result.value.download !== ''
                    ) {
                      return [result.value]
                    }

                    return []
                  })

                expect(downloadAnchors).toHaveLength(1)
                expect(downloadAnchors[0].download)
                  .toBe('original.jpg')

                const clickMock = anchorClickMocks.get(downloadAnchors[0])
                expect(clickMock).toBeDefined()
                expect(clickMock).toHaveBeenCalledTimes(1)
              }
            )
          }
        )
      }
    )

    describe.each([403, 404, 500])(
      'HTTP %s',
      status => {
        it.each([false, true])(
          'rejects the response with content-length=%s',
          async hasContentLength => {
            const user = userEvent.setup()
            const consoleError = vi
              .spyOn(console, 'error')
              .mockImplementation(() => { })

            const blob = vi.fn().mockResolvedValue(
              new Blob(['error'], { type: 'text/plain' })
            )

            const getReader = vi.fn(() => ({
              read: vi.fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new Uint8Array(5),
                })
                .mockResolvedValueOnce({ done: true }),
              cancel: vi.fn().mockResolvedValue(undefined),
            }))

            const headers = new Headers({
              'content-type': 'text/plain',
            })

            if (hasContentLength) {
              headers.set('content-length', '5')
            }

            mockFetch.mockResolvedValueOnce({
              ok: false,
              status,
              headers,
              blob,
              body: { getReader },
            })

            const DownloadMessages = () => {
              const { messages } = useMessageState()

              return (
                <>
                  {messages.map(message => (
                    <section key={message.key}>
                      <h2>{message.props.header}</h2>
                      <p>{message.props.content}</p>
                    </section>
                  ))}
                </>
              )
            }

            try {
              renderWithProviders(
                <>
                  <SidebarMediaDownload
                    media={{
                      ...mockMedia,
                      downloads: [mockDownloads[0]],
                    }}
                  />
                  <DownloadMessages />
                </>,
                { mocks: [] }
              )

              await user.click(
                screen.getByText('Original').closest('tr')!
              )

              expect(
                await screen.findByText(
                  `The media download task failed with the error: Media download failed with HTTP ${status}`
                )
              ).toBeInTheDocument()

              expect(
                screen.getByRole('heading', { name: 'Downloading media failed' })
              ).toBeInTheDocument()

              expect(
                screen.queryByRole('heading', { name: 'Downloading media' })
              ).not.toBeInTheDocument()

              expect(
                screen.queryByRole('heading', { name: 'Downloading media completed' })
              ).not.toBeInTheDocument()

              expect(mockFetch).toHaveBeenCalledTimes(1)
              expect(blob).not.toHaveBeenCalled()
              expect(getReader).not.toHaveBeenCalled()
              expect(mockCreateObjectURL).not.toHaveBeenCalled()
              expect(mockRevokeObjectURL).not.toHaveBeenCalled()
            } finally {
              consoleError.mockRestore()
            }
          }
        )
      }
    )

    describe('stream integrity', () => {
      const DownloadMessages = () => {
        const { messages } = useMessageState()

        return (
          <>
            {messages.map(message => (
              <section key={message.key}>
                <h2>{message.props.header}</h2>
                <p>{message.props.content}</p>
                {message.onDismiss && (
                  <button
                    type="button"
                    onClick={() => {
                      message.onDismiss?.()
                    }}
                  >
                    Cancel download
                  </button>
                )}
              </section>
            ))}
          </>
        )
      }

      const renderDownload = () =>
        renderWithProviders(
          <>
            <SidebarMediaDownload
              media={{
                ...mockMedia,
                downloads: [mockDownloads[0]],
              }}
            />
            <DownloadMessages />
          </>,
          { mocks: [] }
        )

      it.each([5, 10, 15])(
        'validates %s received bytes against content-length 10',
        async receivedBytes => {
          const user = userEvent.setup()
          const read = vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new Uint8Array(receivedBytes).fill(7),
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined,
            })

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({
              'content-length': '10',
              'content-type': 'image/jpeg',
            }),
            body: {
              getReader: () => ({
                read,
                cancel: vi.fn().mockResolvedValue(undefined),
              }),
            },
          })

          renderDownload()

          await user.click(
            screen.getByText('Original').closest('tr')!
          )

          if (receivedBytes === 10) {
            await waitFor(() => {
              expect(mockRevokeObjectURL)
                .toHaveBeenCalledExactlyOnceWith('blob:mock-url')
            })

            expect(read).toHaveBeenCalledTimes(2)
            expect(
              screen.getByRole('heading', {
                name: 'Downloading media completed',
              })
            ).toBeInTheDocument()
            expect(
              screen.queryByRole('heading', {
                name: 'Downloading media failed',
              })
            ).not.toBeInTheDocument()

            expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)

            const savedBlob = mockCreateObjectURL.mock.calls[0]?.[0]
            expect(savedBlob).toBeInstanceOf(Blob)

            if (!(savedBlob instanceof Blob)) {
              throw new Error('Expected the saved download to be a Blob')
            }

            expect(savedBlob.size).toBe(10)
            expect(savedBlob.type).toBe('image/jpeg')
          } else {
            const errorMessage =
              receivedBytes < 10
                ? 'Incomplete media download: expected 10 bytes, received 5'
                : 'Received more data than expected'

            expect(
              await screen.findByText(
                `The media download task failed with the error: ${errorMessage}`
              )
            ).toBeInTheDocument()

            expect(read).toHaveBeenCalledTimes(
              receivedBytes < 10 ? 2 : 1
            )
            expect(
              screen.getByRole('heading', {
                name: 'Downloading media failed',
              })
            ).toBeInTheDocument()
            expect(
              screen.queryByRole('heading', {
                name: 'Downloading media completed',
              })
            ).not.toBeInTheDocument()

            expect(mockCreateObjectURL).not.toHaveBeenCalled()
            expect(mockRevokeObjectURL).not.toHaveBeenCalled()
          }
        }
      )

      it('does not save or report failure for a canceled stream', async () => {
        const user = userEvent.setup()

        let finishRead!: (
          result: ReadableStreamReadResult<Uint8Array>
        ) => void

        const pendingRead =
          new Promise<ReadableStreamReadResult<Uint8Array>>(resolve => {
            finishRead = resolve
          })

        const read = vi.fn(() => pendingRead)
        const cancel = vi.fn(() => {
          finishRead({ done: true, value: undefined })
          return Promise.resolve()
        })

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({
            'content-length': '10',
            'content-type': 'image/jpeg',
          }),
          body: {
            getReader: () => ({ read, cancel }),
          },
        })

        renderDownload()

        await user.click(
          screen.getByText('Original').closest('tr')!
        )

        await waitFor(() => {
          expect(read).toHaveBeenCalledTimes(1)
        })

        await act(async () => {
          await user.click(
            screen.getByRole('button', {
              name: 'Cancel download',
            })
          )
          await pendingRead
        })

        expect(cancel).toHaveBeenCalledExactlyOnceWith(
          'Download canceled by user'
        )
        expect(mockCreateObjectURL).not.toHaveBeenCalled()
        expect(mockRevokeObjectURL).not.toHaveBeenCalled()
        expect(
          screen.queryByRole('heading', {
            name: 'Downloading media completed',
          })
        ).not.toBeInTheDocument()
        expect(
          screen.queryByRole('heading', {
            name: 'Downloading media failed',
          })
        ).not.toBeInTheDocument()
      })
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
