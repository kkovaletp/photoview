import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gql } from '@apollo/client'
import type { MockedResponse } from '@apollo/client/testing'

import { renderWithProviders } from '../../helpers/testUtils'
import ScannerSection from './ScannerSection'
import { NotificationType } from '../../__generated__/globalTypes'
import type { Message } from '../../components/messages/SubscriptionsHook'

// Reuse the exact operation text so MockedProvider matches
const SCAN_MUTATION = gql`
    mutation scanAllMutation {
        scanAll {
            success
            message
        }
    }
`

// ── Mock child components to avoid unrelated GraphQL traffic ────────────────
vi.mock('./PeriodicScanner', () => ({
    __esModule: true,
    default: () => <div data-testid="periodic-scanner" />,
}))

vi.mock('./ScannerConcurrentWorkers', () => ({
    __esModule: true,
    ScannerConcurrentWorkers: () => <div data-testid="scanner-concurrent-workers" />,
}))

// ── Mock useMessageState while preserving other exports (MessageProvider) ───
let mockMessages: Message[] = []

vi.mock('../../components/messages/MessageState', async importOriginal => {
    const real = await importOriginal<typeof import('../../components/messages/MessageState')>()
    return {
        ...real,
        useMessageState: () => ({
            messages: mockMessages,
            setMessages: vi.fn(),
            add: vi.fn(),
            removeKey: vi.fn(),
        }),
    }
})

describe('ScannerSection', () => {
    beforeEach(() => {
        mockMessages = []
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('renders title, description, default enabled button and child sections', () => {
        renderWithProviders(<ScannerSection />, { mocks: [] })

        expect(screen.getByRole('heading', { name: 'Scanner' })).toBeInTheDocument()
        expect(
            screen.getByText('Will scan all users for new or updated media')
        ).toBeInTheDocument()

        const btn = screen.getByRole('button', { name: 'Scan all users' })
        expect(btn).toBeEnabled()

        // Child stubs render
        expect(screen.getByTestId('periodic-scanner')).toBeInTheDocument()
        expect(screen.getByTestId('scanner-concurrent-workers')).toBeInTheDocument()
    })

    test('disables and shows "Scan in progress…" when a fresh global-scanner-progress message is present', () => {
        mockMessages = [
            {
                key: 'global-scanner-progress',
                type: NotificationType.Message,
                props: { header: 'Scanner', content: 'Running', positive: false },
                timestamp: Date.now(),
            },
        ]

        renderWithProviders(<ScannerSection />, { mocks: [] })

        const btn = screen.getByRole('button', { name: 'Scan in progress…' })
        expect(btn).toBeDisabled()
    })

    test('ignores stale progress message (older than 2 minutes): button enabled with default label', () => {
        const STALE_MS = 2 * 60 * 1000 + 10
        mockMessages = [
            {
                key: 'global-scanner-progress',
                type: NotificationType.Message,
                props: { header: 'Scanner', content: 'Old status', positive: false },
                timestamp: Date.now() - STALE_MS,
            },
        ]

        renderWithProviders(<ScannerSection />, { mocks: [] })

        const btn = screen.getByRole('button', { name: 'Scan all users' })
        expect(btn).toBeEnabled()
    })

    test('treats positive=true as completed (not running): button enabled with default label', () => {
        mockMessages = [
            {
                key: 'global-scanner-progress',
                type: NotificationType.Message,
                props: { header: 'Scanner', content: 'Done', positive: true },
                timestamp: Date.now(),
            },
        ]

        renderWithProviders(<ScannerSection />, { mocks: [] })

        const btn = screen.getByRole('button', { name: 'Scan all users' })
        expect(btn).toBeEnabled()
    })

    test('clicking the button triggers mutation: shows "Starting…" while loading, then restores default', async () => {
        const user = userEvent.setup()
        let called = 0

        const mocks: MockedResponse[] = [
            {
                request: { query: SCAN_MUTATION },
                result: () => {
                    called++
                    return {
                        data: {
                            scanAll: { __typename: 'ScannerResult', success: true, message: 'Started' },
                        },
                    }
                },
                delay: 60, // allow us to observe the loading state
            },
        ]

        renderWithProviders(<ScannerSection />, { mocks })

        const btn = screen.getByRole('button', { name: 'Scan all users' })
        expect(btn).toBeEnabled()

        await user.click(btn)

        // During mutation loading, label switches to "Starting…" and disables
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled()
        })

        // After completion, returns to default label and re-enables
        await waitFor(() => {
            const restored = screen.getByRole('button', { name: 'Scan all users' })
            expect(restored).toBeEnabled()
            expect(called).toBe(1)
        })
    })

    test('logs an error and re-enables when the start mutation fails', async () => {
        const user = userEvent.setup()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        const mocks: MockedResponse[] = [
            {
                request: { query: SCAN_MUTATION },
                // GraphQL error causes the mutation promise to reject by default
                result: {
                    errors: [new (class GQLError extends Error { })('Boom')],
                },
            },
        ]

        renderWithProviders(<ScannerSection />, { mocks })

        const btn = screen.getByRole('button', { name: 'Scan all users' })
        await user.click(btn)

        await waitFor(() =>
            expect(errorSpy).toHaveBeenCalledWith('Failed to start scanner: ', expect.anything())
        )

        // UI recovers
        await waitFor(() => {
            const restored = screen.getByRole('button', { name: 'Scan all users' })
            expect(restored).toBeEnabled()
        })
    })

    test('stable min-width style stays constant across label changes', async () => {
        const { unmount } = renderWithProviders(<ScannerSection />, { mocks: [] })

        let btn = screen.getByRole('button', { name: 'Scan all users' })
        const initialMinWidth = (btn as HTMLButtonElement).style.minWidth
        expect(initialMinWidth).toMatch(/ch$/)

        unmount()

        mockMessages = [
            {
                key: 'global-scanner-progress',
                type: NotificationType.Message,
                props: { header: 'Scanner', content: 'Running', positive: false },
                timestamp: Date.now(),
            },
        ]

        renderWithProviders(<ScannerSection />, { mocks: [] })

        btn = screen.getByRole('button', { name: 'Scan in progress…' })
        const updatedMinWidth = (btn as HTMLButtonElement).style.minWidth
        expect(updatedMinWidth).toBe(initialMinWidth)
    })
})
