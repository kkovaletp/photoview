import { vi, describe, test, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import { GraphQLError } from 'graphql'
import MoveImageFacesModal from './MoveImageFacesModal'
import { MY_FACES_QUERY } from '../PeoplePage'
import { SINGLE_FACE_GROUP } from './singleFaceGroupQuery'
import { SingleFaceGroupQuery } from './__generated__/singleFaceGroupQuery'
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
                        <button key={action.key} onClick={action.onClick} disabled={action.disabled}>
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

const { mockNavigate } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
}))

vi.mock('react-router', async () => {
    const actual: object = await vi.importActual('react-router')
    return { ...actual, useNavigate: () => mockNavigate }
})

// Expose clickable rows for each face group so tests can drive selection
vi.mock('./SelectFaceGroupTable', () => ({
    __esModule: true,
    default: ({ faceGroups, selectedFaceGroup, setSelectedFaceGroup, title }: any) => (
        <div data-testid="select-face-group-table">
            <div data-testid="face-group-table-title">{title}</div>
            {faceGroups?.map((fg: any) => (
                <button
                    key={fg.id}
                    data-testid={`face-group-row-${fg.id}`}
                    onClick={() => setSelectedFaceGroup?.(fg)}
                    aria-pressed={selectedFaceGroup?.id === fg.id}
                >
                    {fg.label ?? 'Unlabeled'}
                </button>
            ))}
        </div>
    ),
}))

// Expose clickable rows for each image face so tests can drive selection
vi.mock('./SelectImageFacesTable', () => ({
    __esModule: true,
    default: ({ imageFaces, selectedImageFaces, setSelectedImageFaces, title }: any) => (
        <div data-testid="select-image-faces-table">
            <div data-testid="image-faces-table-title">{title}</div>
            {imageFaces?.map((face: any) => (
                <button
                    key={face.id}
                    data-testid={`image-face-row-${face.id}`}
                    onClick={() =>
                        setSelectedImageFaces?.((prev: any[]) =>
                            prev.includes(face)
                                ? prev.filter((f: any) => f !== face)
                                : [...prev, face]
                        )
                    }
                    aria-pressed={selectedImageFaces?.includes(face)}
                >
                    {face.media?.title}
                </button>
            ))}
        </div>
    ),
}))

const originalIntersectionObserver = globalThis.IntersectionObserver

beforeAll(() => {
    globalThis.IntersectionObserver = class {
        constructor() { }
        observe() { }
        unobserve() { }
        disconnect() { }
    } as any
})

afterAll(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver
})

// ─── GraphQL documents ────────────────────────────────────────────────────────

const MOVE_IMAGE_FACES_MUTATION = gql`
    mutation moveImageFaces($faceIDs: [ID!]!, $destFaceGroupID: ID!) {
        moveImageFaces(
            imageFaceIDs: $faceIDs
            destinationFaceGroupID: $destFaceGroupID
        ) {
            id
        }
    }
`

const FACE_GROUP_LIST_VARIABLES = {
    limit: 50,
    offset: 0,
} as const

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeImageFace(
    id: string,
    mediaTitle: string
): SingleFaceGroupQuery['faceGroup']['imageFaces'][0] {
    return {
        __typename: 'ImageFace',
        id,
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0.1,
            maxX: 0.5,
            minY: 0.1,
            maxY: 0.5,
        },
        media: {
            __typename: 'Media',
            id: `media-${id}`,
            title: mediaTitle,
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

const sourceFaceGroup: SingleFaceGroupQuery['faceGroup'] = {
    __typename: 'FaceGroup',
    id: 'source-1',
    label: 'Alice',
    imageFaces: [
        makeImageFace('face-a1', 'Alice Photo 1'),
        makeImageFace('face-a2', 'Alice Photo 2'),
    ],
}

function makeDestGroup(id: string, label: string): MyFacesQuery['myFaceGroups'][0] {
    return {
        __typename: 'FaceGroup',
        id,
        label,
        imageFaceCount: 1,
        imageFaces: [],
    }
}

const destGroup1 = makeDestGroup('dest-1', 'Bob')
const destGroup2 = makeDestGroup('dest-2', 'Charlie')

function makeMyFacesMock() {
    return {
        request: {
            query: MY_FACES_QUERY,
            variables: FACE_GROUP_LIST_VARIABLES,
        },
        result: {
            data: {
                myFaceGroups: [
                    { ...sourceFaceGroup, imageFaceCount: 2 },
                    destGroup1,
                    destGroup2,
                ],
            },
        },
    }
}

function makeMoveMock(faceIDs: string[], destFaceGroupID: string) {
    return {
        request: {
            query: MOVE_IMAGE_FACES_MUTATION,
            variables: { faceIDs, destFaceGroupID },
        },
        result: {
            data: {
                moveImageFaces: {
                    __typename: 'FaceGroup',
                    id: destFaceGroupID,
                },
            },
        },
    }
}

function makeSingleFaceGroupMock(id: string) {
    const knownGroup =
        id === sourceFaceGroup.id
            ? sourceFaceGroup
            : [destGroup1, destGroup2].find(group => group.id === id)

    return {
        request: {
            query: SINGLE_FACE_GROUP,
            variables: { id, limit: 200, offset: 0 },
        },
        result: {
            data: {
                faceGroup: {
                    __typename: 'FaceGroup',
                    id,
                    label: knownGroup?.label ?? null,
                    imageFaces: [],
                },
            },
        },
    }
}

function makeMyFacesPageRefetchMock() {
    return {
        request: {
            query: MY_FACES_QUERY,
            variables: FACE_GROUP_LIST_VARIABLES,
        },
        result: makeMyFacesMock().result,
    }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const defaultSetOpen = vi.fn()

function renderModal(
    props: Partial<{
        open: boolean
        setOpen: typeof defaultSetOpen
        faceGroup: SingleFaceGroupQuery['faceGroup']
        preselectedImageFaces: any[]
    }> = {},
    mocks: any[] = []
) {
    const merged = {
        open: true,
        setOpen: defaultSetOpen,
        faceGroup: sourceFaceGroup,
        ...props,
    }
    return render(
        <MockedProvider mocks={mocks}>
            <MoveImageFacesModal {...merged} />
        </MockedProvider>
    )
}

async function goToStep2(mocks: any[] = [makeMyFacesMock()]) {
    renderModal({}, mocks)
    fireEvent.click(
        screen.getByTestId(`image-face-row-${sourceFaceGroup.imageFaces[0].id}`)
    )
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))
    await waitFor(() =>
        expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks()
})

describe('MoveImageFacesModal', () => {
    // ── Rendering ──────────────────────────────────────────────────────────────

    describe('rendering', () => {
        test('renders nothing when open is false', () => {
            renderModal({ open: false })
            expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
        })

        test('renders the modal with correct title and description when open', () => {
            renderModal()
            expect(screen.getByTestId('modal')).toBeInTheDocument()
            expect(screen.getByTestId('modal-title')).toHaveTextContent('Move Image Faces')
            expect(screen.getByTestId('modal-description')).toHaveTextContent(
                'Move selected images of this face group to another face group'
            )
        })

        test('shows SelectImageFacesTable (step 1) on initial open', () => {
            renderModal()
            expect(screen.getByTestId('select-image-faces-table')).toBeInTheDocument()
            expect(screen.queryByTestId('select-face-group-table')).not.toBeInTheDocument()
            expect(screen.getByTestId('image-faces-table-title')).toHaveTextContent(
                'Select images to move'
            )
        })

        test('shows "Next" action button (disabled) and "Cancel" action button in step 1', () => {
            renderModal()
            const nextBtn = screen.getByRole('button', { name: /Next/i })
            expect(nextBtn).toBeInTheDocument()
            expect(nextBtn).toBeDisabled()
            expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
            expect(
                screen.queryByRole('button', { name: /Move image faces/i })
            ).not.toBeInTheDocument()
        })

        test('renders image faces passed via faceGroup prop inside SelectImageFacesTable', () => {
            renderModal()
            for (const face of sourceFaceGroup.imageFaces) {
                expect(screen.getByTestId(`image-face-row-${face.id}`)).toBeInTheDocument()
            }
        })

        test('modal stays open and does not navigate on mutation error', async () => {
            const faceId = sourceFaceGroup.imageFaces[0].id
            const errorMock = {
                request: {
                    query: MOVE_IMAGE_FACES_MUTATION,
                    variables: { faceIDs: [faceId], destFaceGroupID: destGroup1.id },
                },
                error: new Error('Network error'),
            }

            renderModal({}, [makeMyFacesMock(), errorMock])

            fireEvent.click(screen.getByTestId(`image-face-row-${faceId}`))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )

            fireEvent.click(screen.getByTestId(`face-group-row-${destGroup1.id}`))
            fireEvent.click(screen.getByRole('button', { name: /Move image faces/i }))

            // Allow time for mutation to attempt and fail
            await waitFor(() => {
                expect(defaultSetOpen).not.toHaveBeenCalled()
                expect(mockNavigate).not.toHaveBeenCalled()
                expect(screen.getByRole('alert')).toHaveTextContent(/Network error/i)
            })
        })

        test('modal stays open and shows GraphQL errors returned by the mutation', async () => {
            const faceId = sourceFaceGroup.imageFaces[0].id
            const errorMock = {
                request: {
                    query: MOVE_IMAGE_FACES_MUTATION,
                    variables: { faceIDs: [faceId], destFaceGroupID: destGroup1.id },
                },
                result: {
                    errors: [new GraphQLError('GraphQL error')],
                },
            }

            renderModal({}, [makeMyFacesMock(), errorMock, makeMyFacesMock()])

            fireEvent.click(screen.getByTestId(`image-face-row-${faceId}`))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )

            fireEvent.click(screen.getByTestId(`face-group-row-${destGroup1.id}`))
            fireEvent.click(screen.getByRole('button', { name: /Move image faces/i }))

            await waitFor(() => {
                expect(defaultSetOpen).not.toHaveBeenCalled()
                expect(mockNavigate).not.toHaveBeenCalled()
                expect(screen.getByRole('alert')).toHaveTextContent(/GraphQL error/i)
            })
        })
    })

    // ── Step 1: image selection ────────────────────────────────────────────────

    describe('step 1 - image face selection', () => {
        test('Next is disabled when no images are selected', () => {
            renderModal()
            const nextBtn = screen.getByRole('button', { name: /Next/i })
            expect(nextBtn).toBeDisabled()
            fireEvent.click(nextBtn)
            // Still on step 1
            expect(screen.getByTestId('select-image-faces-table')).toBeInTheDocument()
            expect(screen.queryByTestId('select-face-group-table')).not.toBeInTheDocument()
        })

        test('Next advances to step 2 after at least one image face is selected', async () => {
            renderModal({}, [makeMyFacesMock()])

            fireEvent.click(
                screen.getByTestId(`image-face-row-${sourceFaceGroup.imageFaces[0].id}`)
            )
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            await waitFor(() => {
                expect(screen.queryByTestId('select-image-faces-table')).not.toBeInTheDocument()
            })
        })
    })

    // ── Step 2: destination face group selection ───────────────────────────────

    describe('step 2 - destination face group selection', () => {
        test('shows SelectFaceGroupTable with correct title after face group data loads', async () => {
            await goToStep2()
            expect(screen.getByTestId('face-group-table-title')).toHaveTextContent(
                'Select destination face group'
            )
        })

        test('shows "Move image faces" button (disabled) and "Cancel" button in step 2', async () => {
            await goToStep2()
            const moveBtn = screen.getByRole('button', { name: /Move image faces/i })
            expect(moveBtn).toBeInTheDocument()
            expect(moveBtn).toBeDisabled()
            expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument()
        })

        test('filters out the source faceGroup from available destinations', async () => {
            await goToStep2()
            // source-1 should NOT appear in the destination list
            expect(screen.queryByTestId(`face-group-row-${sourceFaceGroup.id}`)).not.toBeInTheDocument()
            // other groups should be present
            expect(screen.getByTestId(`face-group-row-${destGroup1.id}`)).toBeInTheDocument()
            expect(screen.getByTestId(`face-group-row-${destGroup2.id}`)).toBeInTheDocument()
        })

        test('shows a loading indicator while face group query is in flight', async () => {
            renderModal({}, [{ ...makeMyFacesMock(), delay: 30 }])
            fireEvent.click(
                screen.getByTestId(`image-face-row-${sourceFaceGroup.imageFaces[0].id}`)
            )
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            // Immediately after Next, before the query resolves, a loading state appears
            expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument()

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )
        })

        test('shows an inline error and retries when destination face groups fail to load', async () => {
            const faceId = sourceFaceGroup.imageFaces[0].id
            const loadErrorMock = {
                request: {
                    query: MY_FACES_QUERY,
                    variables: FACE_GROUP_LIST_VARIABLES,
                },
                error: new Error('Failed to load face groups'),
            }

            renderModal({}, [loadErrorMock, makeMyFacesMock()])

            fireEvent.click(screen.getByTestId(`image-face-row-${faceId}`))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent(
                    /Failed to load face groups/i
                )
            })

            fireEvent.click(screen.getByRole('button', { name: /Retry/i }))

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )
        })

        test('Move is disabled when no destination face group is selected', async () => {
            await goToStep2()
            const moveBtn = screen.getByRole('button', { name: /Move image faces/i })
            expect(moveBtn).toBeDisabled()
            fireEvent.click(moveBtn)
            // Modal still open, no mutation/navigation
            expect(mockNavigate).not.toHaveBeenCalled()
            expect(defaultSetOpen).not.toHaveBeenCalled()
        })
    })

    // ── Completing the move ────────────────────────────────────────────────────

    describe('executing the move', () => {
        test('triggers mutation with correct variables then closes modal and navigates', async () => {
            const faceId = sourceFaceGroup.imageFaces[0].id
            const moveMock = makeMoveMock([faceId], destGroup1.id)

            // Provide MY_FACES_QUERY twice: once for loadFaceGroups, once for refetchQueries
            renderModal({}, [
                makeMyFacesMock(),
                moveMock,
                makeMyFacesPageRefetchMock(),
                makeSingleFaceGroupMock(destGroup1.id),
                makeSingleFaceGroupMock(sourceFaceGroup.id),
            ])

            // Select one image face and advance to step 2
            fireEvent.click(screen.getByTestId(`image-face-row-${faceId}`))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )

            // Select destination and move
            fireEvent.click(screen.getByTestId(`face-group-row-${destGroup1.id}`))
            fireEvent.click(screen.getByRole('button', { name: /Move image faces/i }))

            await waitFor(() => {
                expect(defaultSetOpen).toHaveBeenCalledWith(false)
                expect(mockNavigate).toHaveBeenCalledWith(`/people/${destGroup1.id}`)
            })
        })

        test('sends all selected face IDs when multiple images are chosen', async () => {
            const faceId1 = sourceFaceGroup.imageFaces[0].id
            const faceId2 = sourceFaceGroup.imageFaces[1].id
            const moveMock = makeMoveMock([faceId1, faceId2], destGroup2.id)

            renderModal({}, [
                makeMyFacesMock(),
                moveMock,
                makeMyFacesPageRefetchMock(),
                makeSingleFaceGroupMock(destGroup2.id),
                makeSingleFaceGroupMock(sourceFaceGroup.id),
            ])

            fireEvent.click(screen.getByTestId(`image-face-row-${faceId1}`))
            fireEvent.click(screen.getByTestId(`image-face-row-${faceId2}`))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )

            fireEvent.click(screen.getByTestId(`face-group-row-${destGroup2.id}`))
            fireEvent.click(screen.getByRole('button', { name: /Move image faces/i }))

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith(`/people/${destGroup2.id}`)
            })
        })

        test('stays open when mutation resolves with data AND GraphQL errors', async () => {
            const faceId = sourceFaceGroup.imageFaces[0].id
            const dataAndErrorsMock = {
                request: {
                    query: MOVE_IMAGE_FACES_MUTATION,
                    variables: { faceIDs: [faceId], destFaceGroupID: destGroup1.id },
                },
                result: {
                    data: {
                        moveImageFaces: {
                            __typename: 'FaceGroup',
                            id: destGroup1.id,
                        },
                    },
                    errors: [new GraphQLError('GraphQL error')],
                },
            }

            renderModal({}, [makeMyFacesMock(), dataAndErrorsMock, makeMyFacesMock()])

            // Step 1 → select image and Next
            fireEvent.click(screen.getByTestId(`image-face-row-${faceId}`))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))
            await waitFor(() => expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument())

            // Step 2 → select destination and Move
            fireEvent.click(screen.getByTestId(`face-group-row-${destGroup1.id}`))
            fireEvent.click(screen.getByRole('button', { name: /Move image faces/i }))

            await waitFor(() => {
                expect(defaultSetOpen).not.toHaveBeenCalled()
                expect(mockNavigate).not.toHaveBeenCalled()
                expect(screen.getByRole('alert')).toHaveTextContent(/GraphQL error/i)
            })
        })

        test('stays open and shows duplicate image error when destination already contains selected media', async () => {
            const faceId = sourceFaceGroup.imageFaces[0].id
            const duplicateErrorMock = {
                request: {
                    query: MOVE_IMAGE_FACES_MUTATION,
                    variables: { faceIDs: [faceId], destFaceGroupID: destGroup1.id },
                },
                result: {
                    errors: [
                        new GraphQLError(
                            'cannot move faces because the destination would contain duplicate images'
                        ),
                    ],
                },
            }

            renderModal({}, [makeMyFacesMock(), duplicateErrorMock])

            fireEvent.click(screen.getByTestId(`image-face-row-${faceId}`))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )

            fireEvent.click(screen.getByTestId(`face-group-row-${destGroup1.id}`))
            fireEvent.click(screen.getByRole('button', { name: /Move image faces/i }))

            await waitFor(() => {
                expect(defaultSetOpen).not.toHaveBeenCalled()
                expect(mockNavigate).not.toHaveBeenCalled()
                expect(screen.getByRole('alert')).toHaveTextContent(/duplicate images/i)
            })
        })
    })

    // ── preselectedImageFaces ──────────────────────────────────────────────────

    describe('preselectedImageFaces prop', () => {
        test('skips step 1 and goes directly to step 2 when preselectedImageFaces is provided', async () => {
            const preselected = [sourceFaceGroup.imageFaces[0]]

            renderModal({ preselectedImageFaces: preselected }, [makeMyFacesMock()])

            // Step 1 table must not be visible
            expect(screen.queryByTestId('select-image-faces-table')).not.toBeInTheDocument()

            // Step 2 table appears after query resolves
            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )
        })

        test('uses the preselected face IDs when executing the mutation', async () => {
            const preselected = [sourceFaceGroup.imageFaces[0]]
            const faceId = preselected[0].id
            const moveMock = makeMoveMock([faceId], destGroup1.id)

            // Provide MY_FACES_QUERY twice: initial load + refetch after mutation
            renderModal({ preselectedImageFaces: preselected }, [
                makeMyFacesMock(),
                moveMock,
                makeMyFacesPageRefetchMock(),
                makeSingleFaceGroupMock(destGroup1.id),
                makeSingleFaceGroupMock(sourceFaceGroup.id),
            ])

            await waitFor(() =>
                expect(screen.getByTestId('select-face-group-table')).toBeInTheDocument()
            )

            fireEvent.click(screen.getByTestId(`face-group-row-${destGroup1.id}`))
            fireEvent.click(screen.getByRole('button', { name: /Move image faces/i }))

            await waitFor(() => {
                expect(defaultSetOpen).toHaveBeenCalledWith(false)
                expect(mockNavigate).toHaveBeenCalledWith(`/people/${destGroup1.id}`)
            })
        })
    })

    // ── Cancel and close behaviour ─────────────────────────────────────────────

    describe('cancel and close', () => {
        test('Cancel button calls setOpen(false)', () => {
            renderModal()
            fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
            expect(defaultSetOpen).toHaveBeenCalledWith(false)
        })

        test('modal onClose handler calls setOpen(false)', () => {
            renderModal()
            fireEvent.click(screen.getByTestId('modal-close'))
            expect(defaultSetOpen).toHaveBeenCalledWith(false)
        })
    })

    // ── State reset when modal reopens ─────────────────────────────────────────

    describe('state reset on reopen', () => {
        test('resets to step 1 when modal is closed and reopened', async () => {
            const setOpen = vi.fn()
            // Provide MY_FACES_QUERY for the loadFaceGroups() call when advancing to step 2
            const { rerender } = renderModal({ open: true, setOpen }, [makeMyFacesMock()])

            // Advance to step 2
            fireEvent.click(
                screen.getByTestId(`image-face-row-${sourceFaceGroup.imageFaces[0].id}`)
            )
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))
            await waitFor(() =>
                expect(screen.queryByTestId('select-image-faces-table')).not.toBeInTheDocument()
            )

            // Close the modal (open=false triggers the reset effect)
            rerender(
                <MockedProvider mocks={[]}>
                    <MoveImageFacesModal
                        open={false}
                        setOpen={setOpen}
                        faceGroup={sourceFaceGroup}
                    />
                </MockedProvider>
            )

            // Reopen the modal
            rerender(
                <MockedProvider mocks={[]}>
                    <MoveImageFacesModal
                        open={true}
                        setOpen={setOpen}
                        faceGroup={sourceFaceGroup}
                    />
                </MockedProvider>
            )

            // Should be back on step 1
            expect(screen.getByTestId('select-image-faces-table')).toBeInTheDocument()
            expect(screen.queryByTestId('select-face-group-table')).not.toBeInTheDocument()
        })
    })
})
