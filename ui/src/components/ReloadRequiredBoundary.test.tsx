import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReloadRequiredBoundary from './ReloadRequiredBoundary'

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')

const ThrowChunkLoadError = () => {
    throw new Error('ChunkLoadError: Loading chunk 5 failed')
}

describe('ReloadRequiredBoundary', () => {
    let reloadSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
        reloadSpy = vi.fn()

        Object.defineProperty(globalThis, 'location', {
            value: { reload: reloadSpy },
            configurable: true,
            writable: true,
        })

        vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    afterEach(() => {
        vi.restoreAllMocks()

        if (originalLocation) {
            Object.defineProperty(globalThis, 'location', originalLocation)
        } else {
            Reflect.deleteProperty(globalThis, 'location')
        }
    })

    it('renders children when no error is thrown', () => {
        render(
            <ReloadRequiredBoundary>
                <div>Healthy content</div>
            </ReloadRequiredBoundary>
        )

        expect(screen.getByText('Healthy content')).toBeInTheDocument()
    })

    it('renders the refresh UI when a chunk-load error is thrown', () => {
        render(
            <ReloadRequiredBoundary>
                <ThrowChunkLoadError />
            </ReloadRequiredBoundary>
        )

        expect(
            screen.getByRole('heading', { name: 'Page refresh required' })
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'This tab is using an older UI build and some page files are no longer available on the server. Please refresh the page to continue.'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', { name: 'Refresh page' })
        ).toBeInTheDocument()
    })

    it('reloads the page when the refresh button is clicked', () => {
        render(
            <ReloadRequiredBoundary>
                <ThrowChunkLoadError />
            </ReloadRequiredBoundary>
        )

        fireEvent.click(screen.getByRole('button', { name: 'Refresh page' }))

        expect(reloadSpy).toHaveBeenCalledTimes(1)
    })
})
