import { vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import FaceGroupTitle from './FaceGroupTitle'
import { SET_GROUP_LABEL_MUTATION } from '../PeoplePage'
import { SingleFaceGroupQuery } from './__generated__/singleFaceGroupQuery'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
}))

/**
* Mock MergeFaceGroupsModal: visible when state !== 'closed'.
* Also re-exports MergeFaceGroupsModalState so FaceGroupTitle can import it.
*/
vi.mock('./MergeFaceGroupsModal', () => ({
    __esModule: true,
    default: ({ state }: { state: string }) =>
        state === 'closed' ? null : (
            <div data-testid="merge-modal">Merge Modal</div>
        ),
    MergeFaceGroupsModalState: {
        Closed: 'closed',
        SelectDestination: 'select_destination',
        SelectSources: 'select_sources',
    },
}))

vi.mock('./MoveImageFacesModal', () => ({
    __esModule: true,
    default: ({ open }: { open: boolean }) =>
        open ? <div data-testid="move-modal">Move Modal</div> : null,
}))

vi.mock('./DetachImageFacesModal', () => ({
    __esModule: true,
    default: ({ open }: { open: boolean }) =>
        open ? <div data-testid="detach-modal">Detach Modal</div> : null,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

type FaceGroup = SingleFaceGroupQuery['faceGroup']

const labeledFaceGroup: FaceGroup = {
    __typename: 'FaceGroup',
    id: '1',
    label: 'Alice',
    imageFaces: [],
}

const unlabeledFaceGroup: FaceGroup = {
    ...labeledFaceGroup,
    label: null,
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderComponent(faceGroup?: FaceGroup, mocks: any[] = []) {
    return render(
        <MockedProvider mocks={mocks}>
            <FaceGroupTitle faceGroup={faceGroup} />
        </MockedProvider>
    )
}

function makeSetLabelMock(groupID: string, label: string | null) {
    return {
        request: {
            query: SET_GROUP_LABEL_MUTATION,
            variables: { groupID, label },
        },
        newData: vi.fn(() => ({
            data: {
                setFaceGroupLabel: {
                    __typename: 'FaceGroup' as const,
                    id: groupID,
                    label,
                },
            },
        })),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FaceGroupTitle', () => {
    describe('when faceGroup is undefined', () => {
        test('renders "Unlabeled person" fallback heading', () => {
            renderComponent()
            expect(screen.getByRole('heading')).toHaveTextContent('Unlabeled person')
        })

        test('all action buttons are disabled', () => {
            renderComponent()
            expect(screen.getByRole('button', { name: 'Change label' })).toBeDisabled()
            expect(screen.getByRole('button', { name: 'Merge face' })).toBeDisabled()
            expect(screen.getByRole('button', { name: 'Detach images' })).toBeDisabled()
            expect(screen.getByRole('button', { name: 'Move faces' })).toBeDisabled()
        })

        test('no modal components are rendered', () => {
            renderComponent()
            expect(screen.queryByTestId('merge-modal')).not.toBeInTheDocument()
            expect(screen.queryByTestId('move-modal')).not.toBeInTheDocument()
            expect(screen.queryByTestId('detach-modal')).not.toBeInTheDocument()
        })
    })

    describe('when faceGroup has a label', () => {
        test('renders the label in the heading', () => {
            renderComponent(labeledFaceGroup)
            expect(screen.getByRole('heading')).toHaveTextContent('Alice')
        })

        test('all action buttons are enabled', () => {
            renderComponent(labeledFaceGroup)
            expect(screen.getByRole('button', { name: 'Change label' })).not.toBeDisabled()
            expect(screen.getByRole('button', { name: 'Merge face' })).not.toBeDisabled()
            expect(screen.getByRole('button', { name: 'Detach images' })).not.toBeDisabled()
            expect(screen.getByRole('button', { name: 'Move faces' })).not.toBeDisabled()
        })
    })

    describe('when faceGroup has no label', () => {
        test('renders "Unlabeled person" fallback heading', () => {
            renderComponent(unlabeledFaceGroup)
            expect(screen.getByRole('heading')).toHaveTextContent('Unlabeled person')
        })

        test('all action buttons are still enabled', () => {
            renderComponent(unlabeledFaceGroup)
            expect(screen.getByRole('button', { name: 'Change label' })).not.toBeDisabled()
            expect(screen.getByRole('button', { name: 'Merge face' })).not.toBeDisabled()
        })
    })

    describe('label editing', () => {
        test('clicking "Change label" enters edit mode and shows current label in the input', () => {
            renderComponent(labeledFaceGroup)

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))

            expect(screen.getByRole('textbox')).toBeInTheDocument()
            expect(screen.getByRole('textbox')).toHaveValue('Alice')
        })

        test('clicking "Change label" on an unlabeled face starts with an empty input', () => {
            renderComponent(unlabeledFaceGroup)

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))

            expect(screen.getByRole('textbox')).toHaveValue('')
        })

        test('typing in the input updates the displayed value', () => {
            renderComponent(labeledFaceGroup)

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')

            fireEvent.change(input, { target: { value: 'Bob' } })

            expect(input).toHaveValue('Bob')
        })

        test('pressing Escape exits edit mode and restores the original label', () => {
            renderComponent(labeledFaceGroup)

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Edited Name' } })

            fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
            expect(screen.getByRole('heading')).toHaveTextContent('Alice')
        })

        test('re-entering edit mode after Escape restores the original value in the input', () => {
            renderComponent(labeledFaceGroup)

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape', code: 'Escape' })

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))

            expect(screen.getByRole('textbox')).toHaveValue('Alice')
        })
    })

    describe('setGroupLabel mutation', () => {
        test('saves label successfully and closes edit mode', async () => {
            const mock = makeSetLabelMock('1', 'Alice Updated')
            renderComponent(labeledFaceGroup, [mock])

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')

            fireEvent.change(input, { target: { value: 'Alice Updated' } })
            fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' })

            await waitFor(() => {
                expect(mock.newData).toHaveBeenCalled()
            })
            await waitFor(() => {
                expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
            })
        })

        test('trims whitespace from label before saving', async () => {
            const mock = makeSetLabelMock('1', 'Alice Updated')
            renderComponent(labeledFaceGroup, [mock])

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')

            fireEvent.change(input, { target: { value: '  Alice Updated  ' } })
            fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' })

            await waitFor(() => {
                expect(mock.newData).toHaveBeenCalled()
            })
        })

        test('normalizes a whitespace-only label to null (clears label)', async () => {
            const mock = makeSetLabelMock('1', null)
            renderComponent(labeledFaceGroup, [mock])

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')

            fireEvent.change(input, { target: { value: '   ' } })
            fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' })

            await waitFor(() => {
                expect(mock.newData).toHaveBeenCalled()
            })
        })

        test('entering edit mode resets a previous mutation error via resetSetGroupLabel', async () => {
            const errorMock = {
                request: {
                    query: SET_GROUP_LABEL_MUTATION,
                    variables: { groupID: '1', label: 'Bad Value' },
                },
                result: {
                    errors: [{ message: 'Save failed' }],
                },
            }
            renderComponent(labeledFaceGroup, [errorMock])

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Bad Value' } })
            fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' })

            // Wait for the GraphQL error message to surface in the UI
            await waitFor(() => {
                expect(screen.getByText('Save failed')).toBeInTheDocument()
            })
            // Edit mode is still active (component shows the error inline)
            expect(screen.getByRole('textbox')).toBeInTheDocument()

            // Pressing Escape resets the mutation state and exits edit mode
            fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape', code: 'Escape' })
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

            // Re-opening edit mode should work cleanly without a stale error
            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            expect(screen.getByRole('textbox')).toBeInTheDocument()
            expect(screen.queryByText('Save failed')).not.toBeInTheDocument()
        })
    })

    describe('modal interactions', () => {
        test('clicking "Merge face" opens the merge modal', () => {
            renderComponent(labeledFaceGroup)

            expect(screen.queryByTestId('merge-modal')).not.toBeInTheDocument()
            fireEvent.click(screen.getByRole('button', { name: 'Merge face' }))
            expect(screen.getByTestId('merge-modal')).toBeInTheDocument()
        })

        test('clicking "Detach images" opens the detach modal', () => {
            renderComponent(labeledFaceGroup)

            expect(screen.queryByTestId('detach-modal')).not.toBeInTheDocument()
            fireEvent.click(screen.getByRole('button', { name: 'Detach images' }))
            expect(screen.getByTestId('detach-modal')).toBeInTheDocument()
        })

        test('clicking "Move faces" opens the move modal', () => {
            renderComponent(labeledFaceGroup)

            expect(screen.queryByTestId('move-modal')).not.toBeInTheDocument()
            fireEvent.click(screen.getByRole('button', { name: 'Move faces' }))
            expect(screen.getByTestId('move-modal')).toBeInTheDocument()
        })

        test('modals remain closed when faceGroup is undefined (buttons disabled)', () => {
            renderComponent()

            // Buttons are disabled; no modals should appear regardless
            expect(screen.queryByTestId('merge-modal')).not.toBeInTheDocument()
            expect(screen.queryByTestId('detach-modal')).not.toBeInTheDocument()
            expect(screen.queryByTestId('move-modal')).not.toBeInTheDocument()
        })
    })

    describe('focus and blur behavior', () => {
        test('focuses the input when entering edit mode', async () => {
            renderComponent(labeledFaceGroup)

            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')

            await waitFor(() => {
                expect(input).toHaveFocus()
            })
        })

        test('onBlur outside the TextField parent resets edit mode (closes input)', async () => {
            renderComponent(labeledFaceGroup)

            // Enter edit mode
            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')

            // Blur without a relatedTarget → should reset/exit edit mode
            fireEvent.blur(input)

            await waitFor(() => {
                expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
            })
            expect(screen.getByRole('heading')).toHaveTextContent('Alice')
        })

        test('onBlur to an element inside the same parent does NOT reset edit mode', async () => {
            renderComponent(labeledFaceGroup)

            // Enter edit mode
            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')

            // Create a child inside the same parent container and blur to it
            const parent = input.parentElement as HTMLElement
            const inner = document.createElement('button')
            inner.type = 'button'
            inner.textContent = 'inner'
            parent.appendChild(inner)

            // Blur to inner element (parent.contains(relatedTarget) === true)
            fireEvent.blur(input, { relatedTarget: inner })

            // Still in edit mode
            expect(screen.getByRole('textbox')).toBeInTheDocument()
        })
    })

    describe('edge cases', () => {
        test('submitting while faceGroup becomes undefined no-ops (action guard) and keeps edit mode', async () => {
            // Render directly (not using helper) to control rerender precisely
            const { rerender } = render(
                <MockedProvider>
                    <FaceGroupTitle faceGroup={labeledFaceGroup} />
                </MockedProvider>
            )

            // Enter edit mode
            fireEvent.click(screen.getByRole('button', { name: 'Change label' }))
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Alice New' } })

            // Simulate faceGroup disappearing (e.g., route/data update)
            rerender(
                <MockedProvider>
                    <FaceGroupTitle faceGroup={undefined} />
                </MockedProvider>
            )

            // Press Enter to trigger TextField.action. Since faceGroup is now undefined,
            // the component’s action guard (isNil(faceGroup)) returns early — no mutation call.
            // If a mutation were attempted without a mock, MockedProvider would throw.
            fireEvent.keyUp(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' })

            // We should remain in edit mode (textbox still visible), and no unhandled errors occur.
            expect(screen.getByRole('textbox')).toBeInTheDocument()
        })
    })
})
