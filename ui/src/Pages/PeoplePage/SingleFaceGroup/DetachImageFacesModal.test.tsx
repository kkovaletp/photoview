import { vi, describe, test, beforeEach, expect } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import DetachImageFacesModal from './DetachImageFacesModal'
import { MY_FACES_QUERY } from '../PeoplePage'
import { SingleFaceGroupQuery } from './__generated__/SingleFaceGroup'
import { MyFacesQuery } from '../__generated__/PeoplePage'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../../primitives/Modal', () => ({
    __esModule: true,
    default: ({ children, open, title, description, actions, onClose }: any) =>
        open ? (
            <div data-testid="modal">
                <div data-testid="modal-title">{title}</div>
                <div data-testid="modal-description">{description}</div>
                <div data-testid="modal-content">{children}</div>
                <div data-testid="modal-actions">
                    {actions?.map((action: any) => (
                        <button
                            key={action.key}
                            onClick={action.onClick}
                            disabled={action.disabled}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
                <button data-testid="modal-close" onClick={onClose}>
                    Close
                </button>
            </div>
        ) : null,
}))

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual: object = await vi.importActual('react-router-dom')
    return { ...actual, useNavigate: () => mockNavigate }
})

// Make image faces clickable so tests can toggle selection
vi.mock('./SelectImageFacesTable', () => ({
    __esModule: true,
    default: ({ imageFaces, selectedImageFaces, setSelectedImageFaces, title }: any) => (
        <div data-testid="select-image-faces-table">
            <div data-testid="image-faces-table-title">{title}</div>
            {imageFaces?.map((face: any) => {
                const selected = selectedImageFaces?.includes(face)
                return (
                    <button
                        key={face.id}
                        data-testid={`image-face-row-${face.id}`}
                        onClick={() =>
                            setSelectedImageFaces?.((prev: any[]) =>
                                prev.includes(face) ? prev.filter((f: any) => f !== face) : [...prev, face]
                            )
                        }
                        aria-pressed={selected}
                    >
                        {face.media?.title ?? face.id}
                    </button>
                )
            })}
        </div>
    ),
}))

// ─── GraphQL documents ───────────────────────────────────────────────────────

const DETACH_IMAGE_FACES_MUTATION = gql`
    mutation detachImageFaces($faceIDs: [ID!]!) {
        detachImageFaces(imageFaceIDs: $faceIDs) {
            id
            label
        }
    }
`

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeImageFace(id: string, title: string): SingleFaceGroupQuery['faceGroup']['imageFaces'][0] {
    return {
        __typename: 'ImageFace',
        id,
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0.1, maxX: 0.5, minY: 0.1, maxY: 0.5,
        },
        media: {
            __typename: 'Media',
            id: `media-${id}`,
            title,
            type: 'Photo' as any,
            blurhash: null,
            favorite: false,
            thumbnail: {
                __typename: 'MediaURL',
                url: `/thumb/${id}.jpg`,
                width: 150,
                height: 150,
            },
            highRes: null,
            videoWeb: null,
        },
    }
}

const faceGroup: SingleFaceGroupQuery['faceGroup'] = {
    __typename: 'FaceGroup',
    id: 'group-1',
    label: 'Alice',
    imageFaces: [
        makeImageFace('face-a1', 'Alice Photo 1'),
        makeImageFace('face-a2', 'Alice Photo 2'),
    ],
}

function makeMyFacesMock() {
    // Used only for refetchQueries after a successful mutation
    const g1: MyFacesQuery['myFaceGroups'][0] = {
        __typename: 'FaceGroup',
        id: 'group-1',
        label: 'Alice',
        imageFaceCount: 2,
        imageFaces: [],
    }
    return {
        request: { query: MY_FACES_QUERY },
        result: { data: { myFaceGroups: [g1] } },
    }
}

function makeDetachSuccessMock(faceIDs: string[], newGroupId: string) {
    return {
        request: {
            query: DETACH_IMAGE_FACES_MUTATION,
            variables: { faceIDs },
        },
        result: {
            data: {
                detachImageFaces: {
                    __typename: 'FaceGroup',
                    id: newGroupId,
                    label: null,
                },
            },
        },
    }
}

function makeDetachGraphQLErrorMock(faceIDs: string[], message = 'Save failed') {
    return {
        request: {
            query: DETACH_IMAGE_FACES_MUTATION,
            variables: { faceIDs },
        },
        result: {
            errors: [{ message }],
        },
    }
}

function makeDetachNetworkErrorMock(faceIDs: string[]) {
    return {
        request: {
            query: DETACH_IMAGE_FACES_MUTATION,
            variables: { faceIDs },
        },
        error: new Error('Network error'),
    }
}

const myFacesRefetchMock = {
    request: { query: MY_FACES_QUERY },
    result: { data: { myFaceGroups: [] } },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultSetOpen = vi.fn()

function renderModal(
    props: Partial<{
        open: boolean
        setOpen: typeof defaultSetOpen
        faceGroup: SingleFaceGroupQuery['faceGroup']
        selectedImageFaces: SingleFaceGroupQuery['faceGroup']['imageFaces']
    }> = {},
    mocks: any[] = []
) {
    const merged = {
        open: true,
        setOpen: defaultSetOpen,
        faceGroup,
        ...props,
    }
    return render(
        <MockedProvider mocks={mocks}>
            <DetachImageFacesModal {...merged} />
        </MockedProvider>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks()
})

describe('DetachImageFacesModal', () => {
    test('renders nothing when open is false', () => {
        renderModal({ open: false })
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    test('renders modal with correct title and description when open', () => {
        renderModal()
        expect(screen.getByTestId('modal')).toBeInTheDocument()
        expect(screen.getByTestId('modal-title')).toHaveTextContent('Detach Image Faces')
        expect(screen.getByTestId('modal-description')).toHaveTextContent(
            'Detach selected images of this face group and move them to a new face groups'
        )
    })

    test('shows SelectImageFacesTable with provided image faces', () => {
        renderModal()
        expect(screen.getByTestId('select-image-faces-table')).toBeInTheDocument()
        expect(screen.getByTestId('image-faces-table-title')).toHaveTextContent('Select images to detach')
        for (const f of faceGroup.imageFaces) {
            expect(screen.getByTestId(`image-face-row-${f.id}`)).toBeInTheDocument()
        }
    })

    test('allows selecting an image face via the table mock', () => {
        renderModal()
        const row = screen.getByTestId(`image-face-row-${faceGroup.imageFaces[0].id}`)
        expect(row).toHaveAttribute('aria-pressed', 'false')
        fireEvent.click(row)
        expect(row).toHaveAttribute('aria-pressed', 'true')
    })

    test('executes mutation (no selection → empty list), then closes and navigates on success', async () => {
        const mocks = [makeDetachSuccessMock([], 'new-group-0'), makeMyFacesMock()]
        renderModal({}, mocks)

        fireEvent.click(screen.getByRole('button', { name: /Detach image faces/i }))

        await waitFor(() => {
            expect(defaultSetOpen).toHaveBeenCalledWith(false)
            expect(mockNavigate).toHaveBeenCalledWith('/people/new-group-0')
        })
    })

    test('executes mutation with selected face IDs, then closes and navigates', async () => {
        const [f1] = faceGroup.imageFaces
        const mocks = [makeDetachSuccessMock([f1.id], 'new-group-1'), makeMyFacesMock()]
        renderModal({}, mocks)

        fireEvent.click(screen.getByTestId(`image-face-row-${f1.id}`))
        fireEvent.click(screen.getByRole('button', { name: /Detach image faces/i }))

        await waitFor(() => {
            expect(defaultSetOpen).toHaveBeenCalledWith(false)
            expect(mockNavigate).toHaveBeenCalledWith('/people/new-group-1')
        })
    })

    test('uses preselected faces when selectedImageFaces prop is provided', async () => {
        const preselected = [faceGroup.imageFaces[1]]
        const mocks = [makeDetachSuccessMock([preselected[0].id], 'new-group-2'), makeMyFacesMock()]
        renderModal({ selectedImageFaces: preselected }, mocks)

        // Step table is visible but we can run detach immediately because faces are preselected
        fireEvent.click(screen.getByRole('button', { name: /Detach image faces/i }))

        await waitFor(() => {
            expect(defaultSetOpen).toHaveBeenCalledWith(false)
            expect(mockNavigate).toHaveBeenCalledWith('/people/new-group-2')
        })
    })

    test('shows inline alert and stays open on network error', async () => {
        const [f1] = faceGroup.imageFaces
        const mocks = [makeDetachNetworkErrorMock([f1.id])]
        renderModal({}, mocks)

        fireEvent.click(screen.getByTestId(`image-face-row-${f1.id}`))
        fireEvent.click(screen.getByRole('button', { name: /Detach image faces/i }))

        await waitFor(() => {
            expect(defaultSetOpen).not.toHaveBeenCalled()
            expect(mockNavigate).not.toHaveBeenCalled()
            expect(screen.getByRole('alert')).toHaveTextContent(/Network error/i)
        })
    })

    test('shows GraphQL error from hook (errorPolicy: all) and stays open', async () => {
        const [f1] = faceGroup.imageFaces
        const mocks = [myFacesRefetchMock, makeDetachGraphQLErrorMock([f1.id], 'Save failed')]
        renderModal({}, mocks)

        fireEvent.click(screen.getByTestId(`image-face-row-${f1.id}`))
        fireEvent.click(screen.getByRole('button', { name: /Detach image faces/i }))

        await waitFor(() => {
            expect(defaultSetOpen).not.toHaveBeenCalled()
            expect(mockNavigate).not.toHaveBeenCalled()
            expect(screen.getByRole('alert')).toHaveTextContent(/Save failed/i)
        })
    })

    test('Cancel button calls setOpen(false)', () => {
        renderModal()
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
        expect(defaultSetOpen).toHaveBeenCalledWith(false)
    })

    test('onClose handler calls setOpen(false)', () => {
        renderModal()
        fireEvent.click(screen.getByTestId('modal-close'))
        expect(defaultSetOpen).toHaveBeenCalledWith(false)
    })

    test('closing clears inline error and selection; reopening shows reset state', async () => {
        const [f1] = faceGroup.imageFaces
        const mocks = [makeDetachNetworkErrorMock([f1.id])]
        const setOpen = vi.fn()
        const { rerender } = render(
            <MockedProvider mocks={mocks}>
                <DetachImageFacesModal open={true} setOpen={setOpen} faceGroup={faceGroup} />
            </MockedProvider>
        )

        // Trigger a network error so both inlineError and Apollo error are set
        fireEvent.click(screen.getByTestId(`image-face-row-${f1.id}`))
        fireEvent.click(screen.getByRole('button', { name: /Detach image faces/i }))
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

        // Parent closes the modal
        rerender(
            <MockedProvider mocks={[]}>
                <DetachImageFacesModal open={false} setOpen={setOpen} faceGroup={faceGroup} />
            </MockedProvider>
        )

        // Give the useEffect([open]) a tick to run reset/clear logic
        await new Promise(resolve => setTimeout(resolve, 0))

        // Reopen the modal
        rerender(
            <MockedProvider mocks={[]}>
                <DetachImageFacesModal open={true} setOpen={setOpen} faceGroup={faceGroup} />
            </MockedProvider>
        )

        // Error is cleared and selection reset
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        const row = screen.getByTestId(`image-face-row-${f1.id}`)
        expect(row).toHaveAttribute('aria-pressed', 'false')
    })
})
