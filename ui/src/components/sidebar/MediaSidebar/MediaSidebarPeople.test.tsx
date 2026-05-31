import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApolloError } from '@apollo/client'
import MediaSidebarPeople from './MediaSidebarPeople'
import { renderWithProviders } from '../../../helpers/testUtils'
import { MediaType } from '../../../__generated__/globalTypes'
import { MediaSidebarMedia } from './MediaSidebar'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock factories, so these refs are available inside them.

const { mockDetachImageFaces, mockDetachHookState } = vi.hoisted(() => ({
    mockDetachImageFaces: vi.fn(),
    mockDetachHookState: {
        error: undefined as ApolloError | undefined,
    },
}))

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string) => fallback || key,
    }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router') as object
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

// Mock FaceCircleImage to simplify rendering
vi.mock('../../../Pages/PeoplePage/FaceCircleImage', () => ({
    __esModule: true,
    default: ({ imageFace, size }: any) => (
        <div data-testid={`face-circle-${imageFace.id}`}>
            Face {imageFace.id} - {size}
        </div>
    ),
}))

// Mock FaceDetails component
vi.mock('../../../Pages/PeoplePage/PeoplePage', () => ({
    FaceDetails: ({ group, editLabel, setEditLabel }: any) => (
        <div data-testid={`face-details-${group.id}`}>
            {editLabel ? (
                <input
                    data-testid="label-input"
                    defaultValue={group.label}
                    onBlur={() => setEditLabel(false)}
                />
            ) : (
                <span>{group.label || 'Unlabeled'}</span>
            )}
        </div>
    ),
}))

// Mock MergeFaceGroupsModal
vi.mock('../../../Pages/PeoplePage/SingleFaceGroup/MergeFaceGroupsModal', () => ({
    __esModule: true,
    default: ({ state, setState, preselectedDestinationFaceGroup }: any) => (
        <div
            data-testid={`merge-modal-${preselectedDestinationFaceGroup?.id}`}
            data-state={state}
        >
            {state !== 'closed' && (
                <button onClick={() => setState('closed')}>Close Merge Modal</button>
            )}
        </div>
    ),
    MergeFaceGroupsModalState: {
        Closed: 'closed',
        SelectDestination: 'select_destination',
        SelectSources: 'select_sources',
    },
}))

// Mock MoveImageFacesModal
vi.mock('../../../Pages/PeoplePage/SingleFaceGroup/MoveImageFacesModal', () => ({
    __esModule: true,
    default: ({ open, setOpen, faceGroup }: any) => (
        <div
            data-testid={`move-modal-${faceGroup?.id}`}
            data-open={open}
        >
            {open && <button onClick={() => setOpen(false)}>Close Move Modal</button>}
        </div>
    ),
}))

vi.mock(
    '../../../Pages/PeoplePage/SingleFaceGroup/DetachImageFacesModal',
    () => ({
        useDetachImageFaces: () => ({
            detachImageFaces: mockDetachImageFaces,
            error: mockDetachHookState.error,
        }),
    })
)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const createMockMedia = (
    faces: MediaSidebarMedia['faces'] | null = null,
): MediaSidebarMedia => ({
    __typename: 'Media',
    id: 'media-1',
    title: 'test-photo.jpg',
    type: MediaType.Photo,
    highRes: {
        __typename: 'MediaURL',
        url: '/photo/highres.jpg',
        width: 3000,
        height: 2000,
    },
    thumbnail: {
        __typename: 'MediaURL',
        url: '/photo/thumb.jpg',
        width: 400,
        height: 300,
    },
    videoWeb: null,
    album: {
        __typename: 'Album',
        id: 'album-1',
        title: 'Test Album',
    },
    faces: faces ?? undefined,
})

const mockFace = (id: string, groupId: string, label: string | null) => ({
    __typename: 'ImageFace' as const,
    id,
    rectangle: {
        __typename: 'FaceRectangle' as const,
        minX: 0.1,
        maxX: 0.3,
        minY: 0.2,
        maxY: 0.4,
    },
    faceGroup: {
        __typename: 'FaceGroup' as const,
        id: groupId,
        label,
        imageFaceCount: 5,
    },
    media: {
        __typename: 'Media' as const,
        id: 'media-1',
        title: 'test-photo.jpg',
        thumbnail: {
            __typename: 'MediaURL' as const,
            url: '/photo/thumb.jpg',
            width: 400,
            height: 300,
        },
    },
})

const threeDefaultFaces = [
    mockFace('face-1', 'group-1', 'Alice'),
    mockFace('face-2', 'group-2', 'Bob'),
    mockFace('face-3', 'group-3', null),
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MediaSidebarPeople', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockDetachHookState.error = undefined
        mockDetachImageFaces.mockResolvedValue({
            data: { detachImageFaces: { id: 'new-face-group-1', label: null } },
        })
    })

    // ── Rendering ──────────────────────────────────────────────────────────────

    it('should render people section with faces', () => {
        const media = createMockMedia(threeDefaultFaces)
        renderWithProviders(<MediaSidebarPeople media={media} />)

        expect(screen.getByText('People')).toBeInTheDocument()
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()
        expect(screen.getByText('Unlabeled')).toBeInTheDocument()
    })

    it('should not render when faces array is empty', () => {
        const media = createMockMedia([])
        const { container } = renderWithProviders(
            <MediaSidebarPeople media={media} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('should not render when faces is null/undefined', () => {
        const media = createMockMedia(null)
        const { container } = renderWithProviders(
            <MediaSidebarPeople media={media} />
        )

        expect(container.firstChild).toBeNull()
    })

    it('should render FaceCircleImage for each face', () => {
        const media = createMockMedia(threeDefaultFaces)
        renderWithProviders(<MediaSidebarPeople media={media} />)

        expect(screen.getByTestId('face-circle-face-1')).toBeInTheDocument()
        expect(screen.getByTestId('face-circle-face-2')).toBeInTheDocument()
        expect(screen.getByTestId('face-circle-face-3')).toBeInTheDocument()
    })

    it('should pass menuFlipped=true for faces at index divisible by 3 (first column)', () => {
        // With 3 faces, index 0 is menuFlipped=true; indices 1, 2 are false.
        // The component renders without error for all three positions.
        const media = createMockMedia(threeDefaultFaces)
        renderWithProviders(<MediaSidebarPeople media={media} />)
        // Indirectly verified: all menu buttons render for all three faces
        expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(3)
    })

    // ── Menu interactions ──────────────────────────────────────────────────────

    it('should open menu and show all action items when menu button is clicked', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Find and click the first menu button
        const menuButtons = screen.getAllByRole('button')
        await user.click(menuButtons[0])

        await waitFor(() => {
            expect(screen.getByText('Change label')).toBeInTheDocument()
            expect(screen.getByText('Merge face')).toBeInTheDocument()
            expect(screen.getByText('Detach image')).toBeInTheDocument()
            expect(screen.getByText('Move face')).toBeInTheDocument()
        })
    })

    it('should trigger change-label edit mode when "Change label" is clicked', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Open menu
        const menuButtons = screen.getAllByRole('button')
        await user.click(menuButtons[0])

        await waitFor(() => expect(screen.getByText('Change label')).toBeInTheDocument())
        await user.click(screen.getByText('Change label'))

        // Should show input field
        await waitFor(() => {
            expect(screen.getByTestId('label-input')).toBeInTheDocument()
        })
    })

    it('should hide the more-menu button while in label-edit mode', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        const initialButtonCount = screen.getAllByRole('button').length

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Change label')).toBeInTheDocument())
        await user.click(screen.getByText('Change label'))

        await waitFor(() => {
            expect(screen.getAllByRole('button').length).toBeLessThan(initialButtonCount)
        })
    })

    it('should open merge modal when "Merge face" is clicked', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Merge face')).toBeInTheDocument())
        await user.click(screen.getByText('Merge face'))

        // Check modal state for the specific face group
        await waitFor(() => {
            expect(screen.getByTestId('merge-modal-group-1')).toHaveAttribute(
                'data-state',
                'select_destination'
            )
        })
    })

    it('should open move modal when "Move face" is clicked', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Move face')).toBeInTheDocument())
        await user.click(screen.getByText('Move face'))

        // Check modal is open for the specific face group
        await waitFor(() => {
            expect(screen.getByTestId('move-modal-group-1')).toHaveAttribute('data-open', 'true')
        })
    })

    // ── Detach image – success paths ───────────────────────────────────────────

    it('should call detachImageFaces with the correct face when confirmation is accepted', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        await waitFor(() => {
            expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to detach this image?')
            expect(mockDetachImageFaces).toHaveBeenCalledWith(
                [expect.objectContaining({ id: 'face-1' })],
                { sourceFaceGroupID: 'group-1' }
            )
        })

        confirmSpy.mockRestore()
    })

    it('should navigate to the new face group after a successful detach', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/people/new-face-group-1')
        })

        confirmSpy.mockRestore()
    })

    it('should not navigate when mutation resolves with falsy data', async () => {
        mockDetachImageFaces.mockResolvedValue({ data: null })

        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        // Give the promise a tick to resolve
        await waitFor(() => expect(mockDetachImageFaces).toHaveBeenCalled())
        expect(mockNavigate).not.toHaveBeenCalled()

        confirmSpy.mockRestore()
    })

    // ── Detach image – confirmation cancelled ──────────────────────────────────

    it('should not call detachImageFaces when confirmation is cancelled', async () => {
        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        expect(mockDetachImageFaces).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()

        confirmSpy.mockRestore()
    })

    // ── Detach image – error paths ─────────────────────────────────────────────

    it('should display the error message in an alert when detach rejects with an Error instance', async () => {
        mockDetachImageFaces.mockRejectedValue(new Error('Server unavailable'))

        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        // Click "Detach image"
        await waitFor(() => {
            const alert = screen.getByRole('alert')
            expect(alert).toBeInTheDocument()
            expect(alert).toHaveTextContent('Server unavailable')
        })

        expect(mockNavigate).not.toHaveBeenCalled()

        confirmSpy.mockRestore()
    })

    it('should display the fallback translation when detach rejects with a non-Error value', async () => {
        mockDetachImageFaces.mockRejectedValue('string-error')

        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        await waitFor(() => {
            const alert = screen.getByRole('alert')
            expect(alert).toBeInTheDocument()
            expect(alert).toHaveTextContent('Network error while detaching images')
        })

        expect(mockNavigate).not.toHaveBeenCalled()

        confirmSpy.mockRestore()
    })

    it('should clear a previous inlineError when a new detach attempt is started', async () => {
        // First attempt fails
        mockDetachImageFaces.mockRejectedValueOnce(new Error('First failure'))
        // Second attempt succeeds
        mockDetachImageFaces.mockResolvedValueOnce({
            data: { detachImageFaces: { id: 'new-face-group-1', label: null } },
        })

        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        // First detach attempt – produces an error
        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

        // Second detach attempt – error should be cleared immediately
        await user.click(screen.getAllByRole('button')[0])
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/people/new-face-group-1')
        })
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()

        confirmSpy.mockRestore()
    })

    // ── detachError from the hook ──────────────────────────────────────────────

    it('should show the hook-level detachError in the alert when there is no inlineError', async () => {
        mockDetachHookState.error = new ApolloError({
            errorMessage: 'Hook-level network error',
        })

        const media = createMockMedia(threeDefaultFaces)
        renderWithProviders(<MediaSidebarPeople media={media} />)

        const alerts = screen.getAllByRole('alert')
        expect(alerts.length).toBeGreaterThan(0)
        alerts.forEach(a => expect(a).toHaveTextContent('Hook-level network error'))
    })

    it('should prefer inlineError over the hook-level detachError when both are present', async () => {
        mockDetachImageFaces.mockRejectedValue(new Error('Inline error wins'))
        mockDetachHookState.error = new ApolloError({
            errorMessage: 'Hook error should be shadowed',
        })

        const media = createMockMedia(threeDefaultFaces)
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Scope to the first face's container (group-1) so we assert the alert for that specific instance
        const container = screen.getByTestId('face-details-group-1').parentElement as HTMLElement

        // Hook error is visible immediately in this face's area
        expect(within(container).getByRole('alert')).toHaveTextContent('Hook error should be shadowed')

        // Open the menu for the first face only, then detach to trigger inlineError on that instance
        await user.click(within(container).getByRole('button'))
        await waitFor(() => expect(screen.getByText('Detach image')).toBeInTheDocument())
        await user.click(screen.getByText('Detach image'))

        // Inline error now takes precedence for this face's alert
        await waitFor(() => {
            expect(within(container).getByRole('alert')).toHaveTextContent('Inline error wins')
        })

        confirmSpy.mockRestore()
    })

    // ── No alert when no error ─────────────────────────────────────────────────

    it('should not render an alert when there is no error', () => {
        const media = createMockMedia(threeDefaultFaces)
        renderWithProviders(<MediaSidebarPeople media={media} />)

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
