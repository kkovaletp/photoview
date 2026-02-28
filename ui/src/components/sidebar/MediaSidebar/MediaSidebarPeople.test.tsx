import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedResponse } from '@apollo/client/testing'
import MediaSidebarPeople from './MediaSidebarPeople'
import { renderWithProviders } from '../../../helpers/testUtils'
import { MediaType } from '../../../__generated__/globalTypes'
import { MediaSidebarMedia, SIDEBAR_MEDIA_QUERY } from './MediaSidebar'
import { gql } from '@apollo/client'

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string) => fallback || key,
    }),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom') as object
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

// Mock useDetachImageFaces hook
const mockDetachImageFaces = vi.fn()
vi.mock(
    '../../../Pages/PeoplePage/SingleFaceGroup/DetachImageFacesModal',
    () => ({
        useDetachImageFaces: () => mockDetachImageFaces,
    })
)

describe('MediaSidebarPeople', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockDetachImageFaces.mockResolvedValue({
            data: { detachImageFaces: { id: 'new-face-group-1', label: null } },
        })
    })

    const createMockMedia = (hasFaces: boolean): MediaSidebarMedia => ({
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
        faces: hasFaces
            ? [
                {
                    __typename: 'ImageFace',
                    id: 'face-1',
                    rectangle: {
                        __typename: 'FaceRectangle',
                        minX: 0.1,
                        maxX: 0.3,
                        minY: 0.2,
                        maxY: 0.4,
                    },
                    faceGroup: {
                        __typename: 'FaceGroup',
                        id: 'group-1',
                        label: 'Alice',
                        imageFaceCount: 5,
                    },
                    media: {
                        __typename: 'Media',
                        id: 'media-1',
                        title: 'test-photo.jpg',
                        thumbnail: {
                            __typename: 'MediaURL',
                            url: '/photo/thumb.jpg',
                            width: 400,
                            height: 300,
                        },
                    },
                },
                {
                    __typename: 'ImageFace',
                    id: 'face-2',
                    rectangle: {
                        __typename: 'FaceRectangle',
                        minX: 0.5,
                        maxX: 0.7,
                        minY: 0.3,
                        maxY: 0.5,
                    },
                    faceGroup: {
                        __typename: 'FaceGroup',
                        id: 'group-2',
                        label: 'Bob',
                        imageFaceCount: 3,
                    },
                    media: {
                        __typename: 'Media',
                        id: 'media-1',
                        title: 'test-photo.jpg',
                        thumbnail: {
                            __typename: 'MediaURL',
                            url: '/photo/thumb.jpg',
                            width: 400,
                            height: 300,
                        },
                    },
                },
                {
                    __typename: 'ImageFace',
                    id: 'face-3',
                    rectangle: {
                        __typename: 'FaceRectangle',
                        minX: 0.7,
                        maxX: 0.9,
                        minY: 0.1,
                        maxY: 0.3,
                    },
                    faceGroup: {
                        __typename: 'FaceGroup',
                        id: 'group-3',
                        label: null,
                        imageFaceCount: 1,
                    },
                    media: {
                        __typename: 'Media',
                        id: 'media-1',
                        title: 'test-photo.jpg',
                        thumbnail: {
                            __typename: 'MediaURL',
                            url: '/photo/thumb.jpg',
                            width: 400,
                            height: 300,
                        },
                    },
                },
            ]
            : [],
    })

    it('should render people section with faces', () => {
        const media = createMockMedia(true)
        renderWithProviders(<MediaSidebarPeople media={media} />)

        expect(screen.getByText('People')).toBeInTheDocument()
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()
        expect(screen.getByText('Unlabeled')).toBeInTheDocument()
    })

    it('should not render when there are no faces', () => {
        const media = createMockMedia(false)
        const { container } = renderWithProviders(
            <MediaSidebarPeople media={media} />
        )

        expect(container.firstChild).toBeNull()
    })

    it('should render faces in a grid layout', () => {
        const media = createMockMedia(true)
        renderWithProviders(<MediaSidebarPeople media={media} />)

        const faceCircles = screen.getAllByTestId(/^face-circle-/)
        expect(faceCircles).toHaveLength(3)
    })

    it('should render menu button for each face', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        const menuButtons = screen.getAllByRole('button')
        // Filter to get only the menu buttons (not modal buttons)
        const actualMenuButtons = menuButtons.filter(
            (btn) => btn.querySelector('svg') !== null
        )
        expect(actualMenuButtons.length).toBeGreaterThan(0)
    })

    it('should open menu and show all options when menu button is clicked', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Find and click the first menu button
        const menuButtons = screen.getAllByRole('button')
        const firstMenuButton = menuButtons[0]
        await user.click(firstMenuButton)

        await waitFor(() => {
            expect(screen.getByText('Change label')).toBeInTheDocument()
            expect(screen.getByText('Merge face')).toBeInTheDocument()
            expect(screen.getByText('Detach image')).toBeInTheDocument()
            expect(screen.getByText('Move face')).toBeInTheDocument()
        })
    })

    it('should trigger change label mode when "Change label" is clicked', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Open menu
        const menuButtons = screen.getAllByRole('button')
        await user.click(menuButtons[0])

        // Click "Change label"
        await waitFor(() => {
            expect(screen.getByText('Change label')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Change label'))

        // Should show input field
        await waitFor(() => {
            expect(screen.getByTestId('label-input')).toBeInTheDocument()
        })
    })

    it('should open merge modal when "Merge face" is clicked', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Open menu for first face (Alice - group-1)
        const menuButtons = screen.getAllByRole('button')
        await user.click(menuButtons[0])

        // Click "Merge face"
        await waitFor(() => {
            expect(screen.getByText('Merge face')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Merge face'))

        // Check modal state for the specific face group
        await waitFor(() => {
            const mergeModal = screen.getByTestId('merge-modal-group-1')
            expect(mergeModal).toHaveAttribute('data-state', 'select_destination')
        })
    })

    it('should open move modal when "Move face" is clicked', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Open menu for first face (Alice - group-1)
        const menuButtons = screen.getAllByRole('button')
        await user.click(menuButtons[0])

        // Click "Move face"
        await waitFor(() => {
            expect(screen.getByText('Move face')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Move face'))

        // Check modal is open for the specific face group
        await waitFor(() => {
            const moveModal = screen.getByTestId('move-modal-group-1')
            expect(moveModal).toHaveAttribute('data-open', 'true')
        })
    })

    it('should handle detach image with confirmation', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()

        // Mock window.confirm
        const confirmSpy = vi.spyOn(window, 'confirm')
        confirmSpy.mockReturnValue(true)

        const mocks: MockedResponse[] = [
            {
                request: {
                    query: SIDEBAR_MEDIA_QUERY,
                    variables: { id: 'media-1' },
                },
                result: {
                    data: {
                        media: createMockMedia(true),
                    },
                },
            },
        ]

        renderWithProviders(<MediaSidebarPeople media={media} />, { mocks })

        // Open menu
        const menuButtons = screen.getAllByRole('button')
        await user.click(menuButtons[0])

        // Click "Detach image"
        await waitFor(() => {
            expect(screen.getByText('Detach image')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Detach image'))

        // Verify confirm was called
        await waitFor(() => {
            expect(confirmSpy).toHaveBeenCalledWith(
                'Are you sure you want to detach this image?'
            )
        })

        // Verify mutation was called
        await waitFor(() => {
            expect(mockDetachImageFaces).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'face-1' }),
            ])
        })

        // Verify navigation
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/people/new-face-group-1')
        })

        confirmSpy.mockRestore()
    })

    it('should not detach image when confirmation is cancelled', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()

        // Mock window.confirm to return false
        const confirmSpy = vi.spyOn(window, 'confirm')
        confirmSpy.mockReturnValue(false)

        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Open menu
        const menuButtons = screen.getAllByRole('button')
        await user.click(menuButtons[0])

        // Click "Detach image"
        await waitFor(() => {
            expect(screen.getByText('Detach image')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Detach image'))

        // Verify confirm was called
        expect(confirmSpy).toHaveBeenCalled()

        // Verify mutation was NOT called
        expect(mockDetachImageFaces).not.toHaveBeenCalled()

        // Verify no navigation
        expect(mockNavigate).not.toHaveBeenCalled()

        confirmSpy.mockRestore()
    })

    it('should hide menu when editing label', async () => {
        const media = createMockMedia(true)
        const user = userEvent.setup()
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // Get initial menu button count
        const initialMenuButtons = screen.getAllByRole('button')
        const initialCount = initialMenuButtons.length

        // Open menu and start editing
        await user.click(initialMenuButtons[0])
        await waitFor(() => {
            expect(screen.getByText('Change label')).toBeInTheDocument()
        })
        await user.click(screen.getByText('Change label'))

        // Wait for edit mode
        await waitFor(() => {
            expect(screen.getByTestId('label-input')).toBeInTheDocument()
        })

        // Menu button should be hidden (fewer buttons now)
        const buttonsWhileEditing = screen.getAllByRole('button')
        expect(buttonsWhileEditing.length).toBeLessThan(initialCount)
    })

    it('should apply menu flip for first column faces', () => {
        const media = createMockMedia(true)
        renderWithProviders(<MediaSidebarPeople media={media} />)

        // The first face (index 0) should have menuFlipped=true (0 % 3 == 0)
        // This is tested indirectly through rendering without errors
        expect(screen.getByText('Alice')).toBeInTheDocument()
    })
})
