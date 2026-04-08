import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider, MockedResponse } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import { MemoryRouter } from 'react-router-dom'
import { SidebarPhotoCover, SidebarAlbumCover } from './AlbumCovers'
import { renderWithProviders } from '../../helpers/testUtils'
import * as authentication from '../../helpers/authentication'
import { MessageProvider } from '../messages/MessageState'
import { ReactNode } from 'react'

// ─── Auth mock ───────────────────────────────────────────────────────────────
vi.mock('../../helpers/authentication.ts')
const authToken = vi.mocked(authentication.authToken)

// ─── GraphQL documents (must match component exactly) ────────────────────────
const SET_ALBUM_COVER_MUTATION = gql`
    mutation setAlbumCover($coverID: ID!) {
        setAlbumCover(coverID: $coverID) {
            id
            thumbnail {
                id
                thumbnail {
                    url
                }
            }
        }
    }
`

const RESET_ALBUM_COVER_MUTATION = gql`
    mutation resetAlbumCover($albumID: ID!) {
        resetAlbumCover(albumID: $albumID) {
            id
            thumbnail {
                id
                thumbnail {
                    url
                }
            }
        }
    }
`

// ─── Mock data ────────────────────────────────────────────────────────────────
const setAlbumCoverResult = {
    data: {
        setAlbumCover: {
            __typename: 'Album' as const,
            id: 'album-1',
            thumbnail: {
                __typename: 'Media' as const,
                id: 'media-1',
                thumbnail: {
                    __typename: 'MediaURL' as const,
                    url: '/thumbnail.jpg',
                },
            },
        },
    },
}

const resetAlbumCoverResult = {
    data: {
        resetAlbumCover: {
            __typename: 'Album' as const,
            id: 'album-1',
            thumbnail: {
                __typename: 'Media' as const,
                id: 'media-1',
                thumbnail: {
                    __typename: 'MediaURL' as const,
                    url: '/thumbnail.jpg',
                },
            },
        },
    },
}

// ─── Local wrapper for prop-change (rerender) tests ──────────────────────────
function makeWrapper(mocks: MockedResponse[]) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <MockedProvider mocks={mocks}>
                <MemoryRouter>
                    <MessageProvider>{children}</MessageProvider>
                </MemoryRouter>
            </MockedProvider>
        )
    }
}

// ─── SidebarPhotoCover ───────────────────────────────────────────────────────
describe('SidebarPhotoCover', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        authToken.mockReturnValue('test-token')
    })

    it('renders nothing when not authenticated', () => {
        authToken.mockReturnValue(undefined)

        const { container } = renderWithProviders(
            <SidebarPhotoCover cover_id="media-1" />,
            { mocks: [] }
        )

        expect(container.firstChild).toBeNull()
    })

    it('renders the album cover section when authenticated', () => {
        renderWithProviders(<SidebarPhotoCover cover_id="media-1" />, { mocks: [] })

        expect(screen.getAllByText('Album cover').length).toBeGreaterThan(0)
        expect(
            screen.getByRole('button', { name: /set as album cover photo/i })
        ).toBeInTheDocument()
    })

    it('renders an accessible screen-reader table header', () => {
        renderWithProviders(<SidebarPhotoCover cover_id="media-1" />, { mocks: [] })

        // The sr-only thead contains a th with the section title
        const header = screen.getByRole('columnheader', { hidden: true })
        expect(header).toHaveTextContent('Album cover')
    })

    it('button is enabled on initial render', () => {
        renderWithProviders(<SidebarPhotoCover cover_id="media-1" />, { mocks: [] })

        expect(
            screen.getByRole('button', { name: /set as album cover photo/i })
        ).not.toBeDisabled()
    })

    it('disables the button immediately after click', async () => {
        const user = userEvent.setup()
        const mocks: MockedResponse[] = [
            {
                request: {
                    query: SET_ALBUM_COVER_MUTATION,
                    variables: { coverID: 'media-1' },
                },
                result: setAlbumCoverResult,
            },
        ]

        renderWithProviders(<SidebarPhotoCover cover_id="media-1" />, { mocks })

        const button = screen.getByRole('button', { name: /set as album cover photo/i })
        await user.click(button)

        expect(button).toBeDisabled()
    })

    it('fires the setAlbumCover mutation with correct variables on click', async () => {
        const user = userEvent.setup()
        const mocks: MockedResponse[] = [
            {
                request: {
                    query: SET_ALBUM_COVER_MUTATION,
                    variables: { coverID: 'media-42' },
                },
                result: setAlbumCoverResult,
            },
        ]

        renderWithProviders(<SidebarPhotoCover cover_id="media-42" />, { mocks })

        await user.click(
            screen.getByRole('button', { name: /set as album cover photo/i })
        )

        // If the mutation variables mismatch, MockedProvider throws "no more mocked responses"
        // Waiting for any pending async work to settle
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /set as album cover photo/i })
            ).toBeDisabled()
        )
    })

    it('re-enables the button when cover_id prop changes', async () => {
        const user = userEvent.setup()
        const mocks: MockedResponse[] = [
            {
                request: {
                    query: SET_ALBUM_COVER_MUTATION,
                    variables: { coverID: 'media-1' },
                },
                result: setAlbumCoverResult,
            },
        ]

        const Wrapper = makeWrapper(mocks)

        // Render a controlled host component so rerender preserves providers
        function Host({ coverId }: Readonly<{ coverId: string }>) {
            return <SidebarPhotoCover cover_id={coverId} />
        }

        const { rerender } = render(
            <Wrapper>
                <Host coverId="media-1" />
            </Wrapper>
        )

        const button = screen.getByRole('button', { name: /set as album cover photo/i })
        await user.click(button)
        expect(button).toBeDisabled()

        // Changing cover_id triggers the useEffect which resets buttonDisabled to false
        rerender(
            <Wrapper>
                <Host coverId="media-2" />
            </Wrapper>
        )

        await waitFor(() => expect(button).not.toBeDisabled())
    })
})

// ─── SidebarAlbumCover ───────────────────────────────────────────────────────
describe('SidebarAlbumCover', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders even when not authenticated (no auth gate)', () => {
        authToken.mockReturnValue(undefined)

        renderWithProviders(<SidebarAlbumCover id="album-1" />, { mocks: [] })

        expect(
            screen.getByRole('button', { name: /reset cover photo/i })
        ).toBeInTheDocument()
    })

    it('renders the album cover section', () => {
        renderWithProviders(<SidebarAlbumCover id="album-1" />, { mocks: [] })

        expect(screen.getAllByText('Album cover').length).toBeGreaterThan(0)
        expect(
            screen.getByRole('button', { name: /reset cover photo/i })
        ).toBeInTheDocument()
    })

    it('renders an accessible screen-reader table header', () => {
        renderWithProviders(<SidebarAlbumCover id="album-1" />, { mocks: [] })

        const header = screen.getByRole('columnheader', { hidden: true })
        expect(header).toHaveTextContent('Album cover')
    })

    it('button is enabled on initial render', () => {
        renderWithProviders(<SidebarAlbumCover id="album-1" />, { mocks: [] })

        expect(
            screen.getByRole('button', { name: /reset cover photo/i })
        ).not.toBeDisabled()
    })

    it('disables the button immediately after click', async () => {
        const user = userEvent.setup()
        const mocks: MockedResponse[] = [
            {
                request: {
                    query: RESET_ALBUM_COVER_MUTATION,
                    variables: { albumID: 'album-1' },
                },
                result: resetAlbumCoverResult,
            },
        ]

        renderWithProviders(<SidebarAlbumCover id="album-1" />, { mocks })

        const button = screen.getByRole('button', { name: /reset cover photo/i })
        await user.click(button)

        expect(button).toBeDisabled()
    })

    it('fires the resetAlbumCover mutation with correct variables on click', async () => {
        const user = userEvent.setup()
        const mocks: MockedResponse[] = [
            {
                request: {
                    query: RESET_ALBUM_COVER_MUTATION,
                    variables: { albumID: 'album-99' },
                },
                result: resetAlbumCoverResult,
            },
        ]

        renderWithProviders(<SidebarAlbumCover id="album-99" />, { mocks })

        await user.click(
            screen.getByRole('button', { name: /reset cover photo/i })
        )

        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: /reset cover photo/i })
            ).toBeDisabled()
        )
    })

    it('re-enables the button when id prop changes', async () => {
        const user = userEvent.setup()
        const mocks: MockedResponse[] = [
            {
                request: {
                    query: RESET_ALBUM_COVER_MUTATION,
                    variables: { albumID: 'album-1' },
                },
                result: resetAlbumCoverResult,
            },
        ]

        const Wrapper = makeWrapper(mocks)

        function Host({ albumId }: Readonly<{ albumId: string }>) {
            return <SidebarAlbumCover id={albumId} />
        }

        const { rerender } = render(
            <Wrapper>
                <Host albumId="album-1" />
            </Wrapper>
        )

        const button = screen.getByRole('button', { name: /reset cover photo/i })
        await user.click(button)
        expect(button).toBeDisabled()

        // Changing id triggers the useEffect which resets buttonDisabled to false
        rerender(
            <Wrapper>
                <Host albumId="album-2" />
            </Wrapper>
        )

        await waitFor(() => expect(button).not.toBeDisabled())
    })
})
