import { vi, describe, test, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import MergeFaceGroupsModal, {
    MergeFaceGroupsModalState,
    COMBINE_FACES_MUTATION,
} from './MergeFaceGroupsModal'
import { MY_FACES_QUERY } from '../PeoplePage'
import { MyFacesQuery } from '../__generated__/PeoplePage'
import { SINGLE_FACE_GROUP } from './singleFaceGroupQuery'

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

// Mock useTranslation to prevent i18n issues
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

// Expose clickable rows for each face group so tests can drive selection; also
// expose the frozen state and current title via testid attributes.
vi.mock('./SelectFaceGroupTable', () => ({
    __esModule: true,
    default: ({
        faceGroups,
        selectedFaceGroups,
        toggleSelectedFaceGroup,
        frozen,
        title,
    }: any) => (
        <div>
            <div data-testid="face-group-table-title">{title}</div>
            <div data-testid="face-group-table-frozen">{frozen ? 'frozen' : 'not-frozen'}</div>
            {faceGroups.map((fg: any) => (
                <button
                    key={fg.id}
                    data-testid={`facegroup-${fg.id}`}
                    onClick={() => toggleSelectedFaceGroup(fg)}
                    aria-pressed={Boolean(selectedFaceGroups?.has(fg))}
                >
                    {fg.label ?? 'Unlabeled'}
                </button>
            ))}
        </div>
    ),
}))

let originalIntersectionObserver: typeof globalThis.IntersectionObserver | undefined
let triggerIntersection: ((isIntersecting?: boolean) => void) | undefined

beforeAll(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
        private readonly callback: IntersectionObserverCallback

        constructor(callback: IntersectionObserverCallback) {
            this.callback = callback
            triggerIntersection = (isIntersecting = true) => {
                this.callback(
                    [{ isIntersecting } as IntersectionObserverEntry],
                    this as unknown as IntersectionObserver
                )
            }
        }

        observe() { }
        unobserve() { }
        disconnect() { }
    } as unknown as typeof IntersectionObserver
})

afterAll(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver as any
})

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const mockFaceGroups: MyFacesQuery['myFaceGroups'] = [
    { __typename: 'FaceGroup', id: '0', label: 'Alice', imageFaceCount: 1, imageFaces: [] },
    { __typename: 'FaceGroup', id: '1', label: 'Bob', imageFaceCount: 1, imageFaces: [] },
    { __typename: 'FaceGroup', id: '2', label: 'Charlie', imageFaceCount: 1, imageFaces: [] },
    { __typename: 'FaceGroup', id: '3', label: null, imageFaceCount: 0, imageFaces: [] },
]

const defaultMyFacesQueryVariables = { limit: 50, offset: 0 }

function makeMyFacesMock(
    faceGroups: MyFacesQuery['myFaceGroups'] = mockFaceGroups,
    variables = defaultMyFacesQueryVariables,
    onResult?: () => void
) {
    return {
        request: {
            query: MY_FACES_QUERY,
            variables,
        },
        result: () => {
            onResult?.()
            return { data: { myFaceGroups: faceGroups } }
        },
        // The modal uses fetchPolicy: 'network-only' and several tests rerender
        // through the same flow. Keep this load mock reusable so tests exercise
        // the modal behavior instead of failing on MockedProvider mock exhaustion.
        maxUsageCount: Number.POSITIVE_INFINITY,
    }
}

function getCombineFacesMock(destinationID: string, sourceIDs: string[]) {
    return {
        request: {
            query: COMBINE_FACES_MUTATION,
            variables: { destID: destinationID, srcIDs: sourceIDs },
        },
        result: {
            data: {
                combineFaceGroups: { __typename: 'FaceGroup' as const, id: destinationID },
            },
        },
    }
}

function getCombineNetworkErrorMock(destinationID: string, sourceIDs: string[]) {
    return {
        request: {
            query: COMBINE_FACES_MUTATION,
            variables: { destID: destinationID, srcIDs: sourceIDs },
        },
        error: new Error('Network failure'),
    }
}

function getCombineGraphQLErrorMock(
    destinationID: string,
    sourceIDs: string[],
    message = 'Server validation failed'
) {
    return {
        request: {
            query: COMBINE_FACES_MUTATION,
            variables: { destID: destinationID, srcIDs: sourceIDs },
        },
        result: { errors: [{ message }] },
    }
}

function getCombineDataAndErrorsMock(
    destinationID: string,
    sourceIDs: string[],
    message = 'Merge not allowed'
) {
    return {
        request: {
            query: COMBINE_FACES_MUTATION,
            variables: { destID: destinationID, srcIDs: sourceIDs },
        },
        result: {
            data: {
                combineFaceGroups: { __typename: 'FaceGroup' as const, id: destinationID },
            },
            errors: [{ message }],
        },
    }
}

function getSingleFaceGroupMock(id: string) {
    return {
        request: {
            query: SINGLE_FACE_GROUP,
            variables: { id, limit: 200, offset: 0 },
        },
        result: {
            data: {
                faceGroup: {
                    __typename: 'FaceGroup' as const,
                    id,
                    label: mockFaceGroups.find(fg => fg.id === id)?.label ?? null,
                    imageFaces: [],
                },
            },
        },
    }
}

// ─── Helpers (top-level to avoid nested-function warnings) ────────────────────

const defaultSetState = vi.fn()

function renderModal(
    props: Partial<{
        state: MergeFaceGroupsModalState
        setState: typeof defaultSetState
        preselectedFaceGroup: { __typename?: 'FaceGroup'; id: string; label?: string | null }
        refetchQueries: any[]
    }> = {},
    mocks: any[] = [makeMyFacesMock()]
) {
    const merged = {
        state: MergeFaceGroupsModalState.SelectDestination,
        setState: defaultSetState,
        refetchQueries: [],
        ...props,
    }
    return render(
        <MockedProvider mocks={mocks}>
            <MergeFaceGroupsModal {...merged} />
        </MockedProvider>
    )
}

/**
 * Advances the component from SelectDestination to SelectSources by clicking
 * the destination face group and then "Next". Returns the setState spy and the
 * render utils so callers can continue the flow.
 */
async function advanceToSelectSources(
    destinationID: string,
    mocks: any[],
    setState = vi.fn()
) {
    const utils = render(
        <MockedProvider mocks={mocks}>
            <MergeFaceGroupsModal
                state={MergeFaceGroupsModalState.SelectDestination}
                setState={setState}
                refetchQueries={[]}
            />
        </MockedProvider>
    )
    await waitFor(() => screen.getByTestId(`facegroup-${destinationID}`))
    fireEvent.click(screen.getByTestId(`facegroup-${destinationID}`))
    fireEvent.click(screen.getByRole('button', { name: /Next/i }))

    utils.rerender(
        <MockedProvider mocks={mocks}>
            <MergeFaceGroupsModal
                state={MergeFaceGroupsModalState.SelectSources}
                setState={setState}
                refetchQueries={[]}
            />
        </MockedProvider>
    )
    return { ...utils, setState }
}

async function doMerge(destinationID: string, sourceIDs: string[], mocks: any[]) {
    const { setState } = await advanceToSelectSources(destinationID, mocks)
    await waitFor(() => screen.getByTestId(`facegroup-${sourceIDs[0]}`))
    for (const id of sourceIDs) fireEvent.click(screen.getByTestId(`facegroup-${id}`))
    fireEvent.click(screen.getByRole('button', { name: /Merge/i }))
    return setState
}

async function setupAndTriggerMerge(
    destinationID: string,
    sourceIDs: string[],
    mocks: any[]
) {
    const utils = await advanceToSelectSources(destinationID, mocks)
    await waitFor(() => screen.getByTestId(`facegroup-${sourceIDs[0]}`))
    for (const id of sourceIDs) fireEvent.click(screen.getByTestId(`facegroup-${id}`))
    fireEvent.click(screen.getByRole('button', { name: /Merge/i }))
    return utils
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks()
    triggerIntersection = undefined
})

describe('MergeFaceGroupsModal', () => {
    // ── Visibility ────────────────────────────────────────────────────────────

    describe('modal visibility', () => {
        test('renders nothing when state is Closed', () => {
            renderModal({ state: MergeFaceGroupsModalState.Closed })
            expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
        })

        test('renders the modal when state is SelectDestination', () => {
            renderModal()
            expect(screen.getByTestId('modal')).toBeInTheDocument()
        })

        test('renders the modal when state is SelectSources', () => {
            renderModal({ state: MergeFaceGroupsModalState.SelectSources })
            expect(screen.getByTestId('modal')).toBeInTheDocument()
        })
    })

    // ── SelectDestination step ────────────────────────────────────────────────

    describe('SelectDestination step', () => {
        test('shows correct title and destination description', () => {
            renderModal()
            expect(screen.getByTestId('modal-title')).toHaveTextContent('Merge Face Groups')
            expect(screen.getByTestId('modal-description')).toHaveTextContent(
                'Select the face group that other groups should be merged into.'
            )
        })

        test('shows Next (disabled) and Cancel actions but not Merge', () => {
            renderModal()
            const nextBtn = screen.getByRole('button', { name: /Next/i })
            expect(nextBtn).toBeInTheDocument()
            expect(nextBtn).toBeDisabled()
            expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /Merge/i })).not.toBeInTheDocument()
        })

        test('renders the search table title for destination', async () => {
            renderModal({}, [makeMyFacesMock()])
            await waitFor(() =>
                expect(screen.getByTestId('face-group-table-title')).toHaveTextContent(
                    'Select the destination face'
                )
            )
        })

        test('shows all face groups in the table', async () => {
            renderModal({}, [makeMyFacesMock()])
            await waitFor(() => {
                for (const fg of mockFaceGroups) {
                    expect(screen.getByTestId(`facegroup-${fg.id}`)).toBeInTheDocument()
                }
            })
        })

        test('table is not frozen when no preselection is provided', async () => {
            renderModal({}, [makeMyFacesMock()])
            await waitFor(() =>
                expect(screen.getByTestId('face-group-table-frozen')).toHaveTextContent('not-frozen')
            )
        })

        test('shows the preselected role choice step when a current face is provided', () => {
            renderModal(
                {
                    state: MergeFaceGroupsModalState.SelectPreselectedRole,
                    preselectedFaceGroup: { id: '0', label: 'Alice' },
                },
                []
            )

            expect(screen.getByText('Merge other faces into this face')).toBeInTheDocument()
            expect(screen.getByText('Merge this face into another face')).toBeInTheDocument()
        })

        test('clicking Next after selecting a destination calls setState(SelectSources)', async () => {
            renderModal({}, [makeMyFacesMock()])
            await waitFor(() => screen.getByTestId('facegroup-0'))
            const nextBtn = screen.getByRole('button', { name: /Next/i })
            expect(nextBtn).toBeDisabled()
            fireEvent.click(screen.getByTestId('facegroup-0'))
            expect(nextBtn).not.toBeDisabled()
            fireEvent.click(nextBtn)
            expect(defaultSetState).toHaveBeenCalledWith(MergeFaceGroupsModalState.SelectSources)
        })

        test('loads the next face-group page when the modal scroll sentinel intersects', async () => {
            const firstPageFaceGroups = Array.from({ length: 50 }, (_, index) => ({
                __typename: 'FaceGroup' as const,
                id: `${index}`,
                label: `Person ${index}`,
                imageFaceCount: 1,
                imageFaces: [],
            }))

            const secondPageFaceGroups: MyFacesQuery['myFaceGroups'] = [
                {
                    __typename: 'FaceGroup',
                    id: '50',
                    label: 'Person 50',
                    imageFaceCount: 1,
                    imageFaces: [],
                },
            ]

            const secondPageLoaded = vi.fn()

            renderModal(
                {},
                [
                    makeMyFacesMock(firstPageFaceGroups),
                    makeMyFacesMock(
                        secondPageFaceGroups,
                        { limit: 50, offset: 50 },
                        secondPageLoaded
                    ),
                ]
            )

            await waitFor(() =>
                expect(screen.getByTestId('facegroup-49')).toBeInTheDocument()
            )

            triggerIntersection?.()

            await waitFor(() => expect(secondPageLoaded).toHaveBeenCalled())
        })
    })

    // ── SelectSources step ────────────────────────────────────────────────────

    describe('SelectSources step', () => {
        test('shows correct sources description and Merge action instead of Next', async () => {
            await advanceToSelectSources('0', [makeMyFacesMock()])
            expect(screen.getByTestId('modal-description')).toHaveTextContent(
                'Select all face groups that will be merged into the destination group.'
            )
            expect(screen.getByRole('button', { name: /Merge/i })).toBeInTheDocument()
            expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument()
        })

        test('source table title includes the selected destination label', async () => {
            await advanceToSelectSources('0', [makeMyFacesMock()])
            await waitFor(() =>
                expect(screen.getByTestId('face-group-table-title')).toHaveTextContent(/Alice/)
            )
        })

        test('source table title falls back to "Unlabeled" when destination has null label', async () => {
            await advanceToSelectSources('3', [makeMyFacesMock()])
            await waitFor(() =>
                expect(screen.getByTestId('face-group-table-title')).toHaveTextContent(/Unlabeled/)
            )
        })

        test('destination face group is excluded from the source list', async () => {
            await advanceToSelectSources('0', [makeMyFacesMock()])
            await waitFor(() => {
                expect(screen.queryByTestId('facegroup-0')).not.toBeInTheDocument()
                expect(screen.getByTestId('facegroup-1')).toBeInTheDocument()
                expect(screen.getByTestId('facegroup-2')).toBeInTheDocument()
            })
        })

        test('can select a source face group (aria-pressed reflects selection)', async () => {
            await advanceToSelectSources('0', [makeMyFacesMock()])
            await waitFor(() => screen.getByTestId('facegroup-1'))
            const sourceBtn = screen.getByTestId('facegroup-1')
            expect(sourceBtn).toHaveAttribute('aria-pressed', 'false')
            fireEvent.click(sourceBtn)
            expect(sourceBtn).toHaveAttribute('aria-pressed', 'true')
        })

        test('can deselect an already-selected source face group', async () => {
            await advanceToSelectSources('0', [makeMyFacesMock()])
            await waitFor(() => screen.getByTestId('facegroup-1'))
            const sourceBtn = screen.getByTestId('facegroup-1')
            fireEvent.click(sourceBtn) // select
            expect(sourceBtn).toHaveAttribute('aria-pressed', 'true')
            fireEvent.click(sourceBtn) // deselect
            expect(sourceBtn).toHaveAttribute('aria-pressed', 'false')
        })

        test('table is not frozen in SelectSources step', async () => {
            await advanceToSelectSources('0', [makeMyFacesMock()])
            expect(screen.getByTestId('face-group-table-frozen')).toHaveTextContent('not-frozen')
        })
    })

    // ── Successful merge ──────────────────────────────────────────────────────

    describe('successful merge', () => {
        test('merges a single source into destination and navigates', async () => {
            const mocks = [makeMyFacesMock(), getCombineFacesMock('0', ['1']), getSingleFaceGroupMock('0')]
            const setState = await doMerge('0', ['1'], mocks)
            await waitFor(() => {
                expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).toHaveBeenCalledWith('/people/0')
            })
        })

        test('merges multiple sources into destination and navigates', async () => {
            const mocks = [makeMyFacesMock(), getCombineFacesMock('0', ['1', '2']), getSingleFaceGroupMock('0')]
            const setState = await doMerge('0', ['1', '2'], mocks)
            await waitFor(() => {
                expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).toHaveBeenCalledWith('/people/0')
            })
        })

        test('merges all available source face groups into destination', async () => {
            const allSourceIDs = mockFaceGroups.slice(1).map(fg => fg.id)
            const mocks = [makeMyFacesMock(), getCombineFacesMock('0', allSourceIDs), getSingleFaceGroupMock('0')]
            const setState = await doMerge('0', allSourceIDs, mocks)
            await waitFor(() => {
                expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).toHaveBeenCalledWith('/people/0')
            })
        })

        test('does not close or navigate when mutation returns no data', async () => {
            const onNoDataResult = vi.fn()
            const noDataMock = {
                request: { query: COMBINE_FACES_MUTATION, variables: { destID: '0', srcIDs: ['1'] } },
                result: () => {
                    onNoDataResult()
                    return { data: null }
                },
            }
            const setState = await doMerge('0', ['1'], [makeMyFacesMock(), noDataMock])
            await waitFor(() => expect(onNoDataResult).toHaveBeenCalled())
            expect(mockNavigate).not.toHaveBeenCalled()
            expect(setState).not.toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
        })
    })

    // ── Error handling ────────────────────────────────────────────────────────

    describe('error handling', () => {
        test('shows load error and retries loading face groups', async () => {
            const loadErrorMock = {
                request: {
                    query: MY_FACES_QUERY,
                    variables: { limit: 50, offset: 0 },
                },
                error: new Error('Failed to load face groups'),
            }
            renderModal({}, [loadErrorMock, makeMyFacesMock()])

            await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
            fireEvent.click(screen.getByRole('button', { name: /Retry/i }))

            await waitFor(() =>
                expect(screen.getByTestId('facegroup-0')).toBeInTheDocument()
            )
        })

        test('shows inline alert and keeps modal open on network error', async () => {
            const mocks = [makeMyFacesMock(), getCombineNetworkErrorMock('0', ['1'])]
            const { setState } = await setupAndTriggerMerge('0', ['1'], mocks)
            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument()
                expect(setState).not.toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).not.toHaveBeenCalled()
            })
        })

        test('displays the network error message in the alert', async () => {
            const mocks = [makeMyFacesMock(), getCombineNetworkErrorMock('0', ['1'])]
            await setupAndTriggerMerge('0', ['1'], mocks)
            await waitFor(() =>
                expect(screen.getByRole('alert')).toHaveTextContent(/Network failure/i)
            )
        })

        test('shows GraphQL error from Apollo (errorPolicy: all) and keeps modal open', async () => {
            const mocks = [makeMyFacesMock(), getCombineGraphQLErrorMock('0', ['1'], 'Merge not allowed')]
            const { setState } = await setupAndTriggerMerge('0', ['1'], mocks)
            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument()
                expect(setState).not.toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).not.toHaveBeenCalled()
            })
        })

        test('keeps modal open when mutation resolves with data AND GraphQL errors', async () => {
            const mocks = [makeMyFacesMock(), getCombineDataAndErrorsMock('0', ['1'], 'Merge not allowed')]
            const { setState } = await setupAndTriggerMerge('0', ['1'], mocks)

            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument()
                expect(screen.getByRole('alert')).toHaveTextContent(/Merge not allowed/i)
                expect(setState).not.toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).not.toHaveBeenCalled()
            })
        })

        test('clears inline error when closeModal is called after a network error', async () => {
            const mocks = [makeMyFacesMock(), getCombineNetworkErrorMock('0', ['1'])]
            await setupAndTriggerMerge('0', ['1'], mocks)
            await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

            fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
            await waitFor(() =>
                expect(screen.queryByRole('alert')).not.toBeInTheDocument()
            )
        })

        test('shows duplicate image validation error and keeps modal open', async () => {
            const mocks = [
                makeMyFacesMock(),
                getCombineGraphQLErrorMock(
                    '0',
                    ['1'],
                    'cannot merge face groups because the destination would contain duplicate images'
                ),
            ]

            const { setState } = await setupAndTriggerMerge('0', ['1'], mocks)

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent(/duplicate images/i)
                expect(setState).not.toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).not.toHaveBeenCalled()
            })
        })
    })

    // ── Preselection ──────────────────────────────────────────────────────────

    describe('preselectedFaceGroup role choice', () => {
        test('choosing current face as destination lets the user select sources', async () => {
            const setState = vi.fn()
            const mocks = [makeMyFacesMock(), getCombineFacesMock('0', ['1']), getSingleFaceGroupMock('0')]

            const { rerender } = render(
                <MockedProvider mocks={mocks}>
                    <MergeFaceGroupsModal
                        state={MergeFaceGroupsModalState.SelectPreselectedRole}
                        setState={setState}
                        preselectedFaceGroup={{ id: '0', label: 'Alice' }}
                        refetchQueries={[]}
                    />
                </MockedProvider>
            )

            fireEvent.click(screen.getByText('Merge other faces into this face'))
            expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.SelectSources)

            rerender(
                <MockedProvider mocks={mocks}>
                    <MergeFaceGroupsModal
                        state={MergeFaceGroupsModalState.SelectSources}
                        setState={setState}
                        preselectedFaceGroup={{ id: '0', label: 'Alice' }}
                        refetchQueries={[]}
                    />
                </MockedProvider>
            )

            await waitFor(() => screen.getByTestId('facegroup-1'))
            fireEvent.click(screen.getByTestId('facegroup-1'))
            fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

            await waitFor(() => {
                expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).toHaveBeenCalledWith('/people/0')
            })
        })

        test('choosing current face as source lets the user pick a different destination', async () => {
            const setState = vi.fn()
            const mocks = [makeMyFacesMock(), getCombineFacesMock('1', ['0']), getSingleFaceGroupMock('1')]

            const { rerender } = render(
                <MockedProvider mocks={mocks}>
                    <MergeFaceGroupsModal
                        state={MergeFaceGroupsModalState.SelectPreselectedRole}
                        setState={setState}
                        preselectedFaceGroup={{ id: '0', label: 'Alice' }}
                        refetchQueries={[]}
                    />
                </MockedProvider>
            )

            fireEvent.click(screen.getByText('Merge this face into another face'))
            expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.SelectDestination)

            rerender(
                <MockedProvider mocks={mocks}>
                    <MergeFaceGroupsModal
                        state={MergeFaceGroupsModalState.SelectDestination}
                        setState={setState}
                        preselectedFaceGroup={{ id: '0', label: 'Alice' }}
                        refetchQueries={[]}
                    />
                </MockedProvider>
            )

            await waitFor(() => screen.getByTestId('facegroup-1'))
            expect(screen.queryByTestId('facegroup-0')).not.toBeInTheDocument()

            fireEvent.click(screen.getByTestId('facegroup-1'))
            fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

            await waitFor(() => {
                expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
                expect(mockNavigate).toHaveBeenCalledWith('/people/1')
            })
        })
    })

    // ── Cancel / Close ────────────────────────────────────────────────────────

    describe('cancel and close behavior', () => {
        test('Cancel in SelectDestination calls setState(Closed)', () => {
            renderModal()
            fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
            expect(defaultSetState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
        })

        test('Cancel in SelectSources calls setState(Closed)', async () => {
            const setState = vi.fn()
            const { rerender } = render(
                <MockedProvider mocks={[makeMyFacesMock()]}>
                    <MergeFaceGroupsModal
                        state={MergeFaceGroupsModalState.SelectDestination}
                        setState={setState}
                        refetchQueries={[]}
                    />
                </MockedProvider>
            )
            await waitFor(() => screen.getByTestId('facegroup-0'))
            fireEvent.click(screen.getByTestId('facegroup-0'))
            fireEvent.click(screen.getByRole('button', { name: /Next/i }))
            rerender(
                <MockedProvider mocks={[makeMyFacesMock()]}>
                    <MergeFaceGroupsModal
                        state={MergeFaceGroupsModalState.SelectSources}
                        setState={setState}
                        refetchQueries={[]}
                    />
                </MockedProvider>
            )
            fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
            expect(setState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
        })

        test('modal close button calls setState(Closed)', () => {
            renderModal()
            fireEvent.click(screen.getByTestId('modal-close'))
            expect(defaultSetState).toHaveBeenCalledWith(MergeFaceGroupsModalState.Closed)
        })

        test('Cancel does not navigate', () => {
            renderModal()
            fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
            expect(mockNavigate).not.toHaveBeenCalled()
        })
    })
})
