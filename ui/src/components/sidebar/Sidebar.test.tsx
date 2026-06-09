import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useContext } from 'react'
import { SidebarContext, SidebarProvider, Sidebar } from './Sidebar'

// ─── Helper consumer component ────────────────────────────────────────────────

/**
 * Reads the full SidebarContext and exposes its state + actions via
 * data-testid attributes / labelled buttons so tests can drive state changes.
 */
function ContextConsumer() {
    const { updateSidebar, setPinned, content, pinned } = useContext(SidebarContext)
    return (
        <div>
            <span data-testid="content-state">{content === null ? 'no-content' : 'has-content'}</span>
            <span data-testid="pinned-state">{String(pinned)}</span>
            <button aria-label="Set Content" onClick={() => updateSidebar(<span>sidebar content</span>)}>
                Set Content
            </button>
            <button aria-label="Clear Content" onClick={() => updateSidebar(null)}>
                Clear Content
            </button>
            <button aria-label="Pin" onClick={() => setPinned(true)}>
                Pin
            </button>
            <button aria-label="Unpin" onClick={() => setPinned(false)}>
                Unpin
            </button>
        </div>
    )
}

// ─── SidebarContext defaults ──────────────────────────────────────────────────

describe('SidebarContext defaults', () => {
    it('warns when updateSidebar is called before initialization', async () => {
        const user = userEvent.setup()
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

        function DefaultConsumer() {
            const { updateSidebar } = useContext(SidebarContext)
            return <button onClick={() => updateSidebar(null)}>call</button>
        }

        render(<DefaultConsumer />)
        await user.click(screen.getByRole('button', { name: 'call' }))

        expect(warnSpy).toHaveBeenCalledWith(
            'SidebarContext: updateSidebar was called before initialized',
            null
        )
        warnSpy.mockRestore()
    })

    it('warns when setPinned is called before initialization', async () => {
        const user = userEvent.setup()
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

        function DefaultConsumer() {
            const { setPinned } = useContext(SidebarContext)
            return <button onClick={() => setPinned(true)}>call</button>
        }

        render(<DefaultConsumer />)
        await user.click(screen.getByRole('button', { name: 'call' }))

        expect(warnSpy).toHaveBeenCalledWith(
            'SidebarContext: setPinned was called before initialized',
            true
        )
        warnSpy.mockRestore()
    })
})

// ─── SidebarProvider ─────────────────────────────────────────────────────────

describe('SidebarProvider', () => {
    it('renders children', () => {
        render(
            <SidebarProvider>
                <div data-testid="child">hello</div>
            </SidebarProvider>
        )
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('provides initial context with null content and pinned=false', () => {
        render(
            <SidebarProvider>
                <ContextConsumer />
            </SidebarProvider>
        )
        expect(screen.getByTestId('content-state')).toHaveTextContent('no-content')
        expect(screen.getByTestId('pinned-state')).toHaveTextContent('false')
    })

    it('updateSidebar with non-null content sets content in context', async () => {
        const user = userEvent.setup()
        render(
            <SidebarProvider>
                <ContextConsumer />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Set Content' }))

        expect(screen.getByTestId('content-state')).toHaveTextContent('has-content')
    })

    it('updateSidebar(null) clears content and resets pinned to false', async () => {
        const user = userEvent.setup()
        render(
            <SidebarProvider>
                <ContextConsumer />
            </SidebarProvider>
        )

        // Establish a content+pinned state first
        await user.click(screen.getByRole('button', { name: 'Set Content' }))
        await user.click(screen.getByRole('button', { name: 'Pin' }))
        expect(screen.getByTestId('content-state')).toHaveTextContent('has-content')
        expect(screen.getByTestId('pinned-state')).toHaveTextContent('true')

        // Clearing content must also reset pinned
        await user.click(screen.getByRole('button', { name: 'Clear Content' }))

        expect(screen.getByTestId('content-state')).toHaveTextContent('no-content')
        expect(screen.getByTestId('pinned-state')).toHaveTextContent('false')
    })

    it('setPinned(true) sets pinned to true in context', async () => {
        const user = userEvent.setup()
        render(
            <SidebarProvider>
                <ContextConsumer />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Pin' }))

        expect(screen.getByTestId('pinned-state')).toHaveTextContent('true')
    })

    it('setPinned(false) sets pinned to false in context', async () => {
        const user = userEvent.setup()
        render(
            <SidebarProvider>
                <ContextConsumer />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Pin' }))
        expect(screen.getByTestId('pinned-state')).toHaveTextContent('true')

        await user.click(screen.getByRole('button', { name: 'Unpin' }))

        expect(screen.getByTestId('pinned-state')).toHaveTextContent('false')
    })
})

// ─── Sidebar ──────────────────────────────────────────────────────────────────

describe('Sidebar', () => {
    beforeEach(() => {
        document.body.className = ''
    })

    afterEach(() => {
        document.body.className = ''
    })

    it('renders the sidebar container', () => {
        const { container } = render(
            <SidebarProvider>
                <Sidebar />
            </SidebarProvider>
        )
        expect(container.querySelector('.fixed')).toBeInTheDocument()
    })

    it('has translate-x-full class when content is null and not pinned', () => {
        const { container } = render(
            <SidebarProvider>
                <Sidebar />
            </SidebarProvider>
        )
        expect(container.querySelector('.fixed')).toHaveClass('translate-x-full')
    })

    it('does not add body overflow classes when content is null', () => {
        render(
            <SidebarProvider>
                <Sidebar />
            </SidebarProvider>
        )
        expect(document.body).not.toHaveClass('overflow-y-hidden')
        expect(document.body).not.toHaveClass('lg:overflow-y-auto')
    })

    it('adds body overflow classes when content is set', async () => {
        const user = userEvent.setup()
        render(
            <SidebarProvider>
                <ContextConsumer />
                <Sidebar />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Set Content' }))

        expect(document.body).toHaveClass('overflow-y-hidden')
        expect(document.body).toHaveClass('lg:overflow-y-auto')
    })

    it('has translate-x-0 class and no translate-x-full class when content is set', async () => {
        const user = userEvent.setup()
        const { container } = render(
            <SidebarProvider>
                <ContextConsumer />
                <Sidebar />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Set Content' }))

        const sidebarDiv = container.querySelector('.fixed')
        expect(sidebarDiv).toHaveClass('translate-x-0')
        expect(sidebarDiv).not.toHaveClass('translate-x-full')
    })

    it('has translate-x-0 class when pinned even with null content', async () => {
        const user = userEvent.setup()
        const { container } = render(
            <SidebarProvider>
                <ContextConsumer />
                <Sidebar />
            </SidebarProvider>
        )

        // Pinning without content still keeps sidebar visible
        await user.click(screen.getByRole('button', { name: 'Pin' }))

        const sidebarDiv = container.querySelector('.fixed')
        expect(sidebarDiv).toHaveClass('translate-x-0')
        expect(sidebarDiv).not.toHaveClass('translate-x-full')
    })

    it('removes body overflow classes when content is cleared', async () => {
        const user = userEvent.setup()
        render(
            <SidebarProvider>
                <ContextConsumer />
                <Sidebar />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Set Content' }))
        expect(document.body).toHaveClass('overflow-y-hidden')

        await user.click(screen.getByRole('button', { name: 'Clear Content' }))

        expect(document.body).not.toHaveClass('overflow-y-hidden')
        expect(document.body).not.toHaveClass('lg:overflow-y-auto')
    })

    it('has lg:shadow-separator class when not pinned', () => {
        const { container } = render(
            <SidebarProvider>
                <Sidebar />
            </SidebarProvider>
        )
        // Use className string check: toHaveClass handles colon-prefixed Tailwind tokens via classList
        expect(container.querySelector('.fixed')).toHaveClass('lg:shadow-separator')
    })

    it('has lg:border-l class and no lg:shadow-separator class when pinned', async () => {
        const user = userEvent.setup()
        const { container } = render(
            <SidebarProvider>
                <ContextConsumer />
                <Sidebar />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Pin' }))

        const sidebarDiv = container.querySelector('.fixed')
        expect(sidebarDiv).toHaveClass('lg:border-l')
        expect(sidebarDiv).not.toHaveClass('lg:shadow-separator')
    })

    it('removes body overflow classes on unmount when content is present', async () => {
        const user = userEvent.setup()
        const { unmount } = render(
            <SidebarProvider>
                <ContextConsumer />
                <Sidebar />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Set Content' }))
        expect(document.body).toHaveClass('overflow-y-hidden')

        unmount()

        expect(document.body).not.toHaveClass('overflow-y-hidden')
        expect(document.body).not.toHaveClass('lg:overflow-y-auto')
    })

    it('renders the sidebar content when provided via context', async () => {
        const user = userEvent.setup()
        render(
            <SidebarProvider>
                <ContextConsumer />
                <Sidebar />
            </SidebarProvider>
        )

        await user.click(screen.getByRole('button', { name: 'Set Content' }))

        expect(screen.getByText('sidebar content')).toBeInTheDocument()
    })
})
