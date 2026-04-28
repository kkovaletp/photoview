import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EthicalUseFlagBadge from './EthicalUseFlagBadge'
import { TERMS_URL } from './AccessDeniedScreen'

// react-i18next and TERMS_URL are handled by the global test setup (setupLocalization).
// No Apollo/router providers are needed — this component is self-contained.

describe('EthicalUseFlagBadge', () => {
    describe('initial state', () => {
        test('renders the flag toggle button', () => {
            render(<EthicalUseFlagBadge />)
            expect(
                screen.getByRole('button', { name: /view terms of use/i })
            ).toBeInTheDocument()
        })

        test('dialog is not rendered on mount', () => {
            render(<EthicalUseFlagBadge />)
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })

        test('button aria-expanded is false before the dialog is opened', () => {
            render(<EthicalUseFlagBadge />)
            expect(
                screen.getByRole('button', { name: /view terms of use/i })
            ).toHaveAttribute('aria-expanded', 'false')
        })
    })

    describe('open / close interactions', () => {
        test('clicking the button opens the dialog and sets aria-expanded to true', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()
            const button = screen.getByRole('button', { name: /view terms of use/i })

            await user.click(button)

            expect(screen.getByRole('dialog')).toBeInTheDocument()
            expect(button).toHaveAttribute('aria-expanded', 'true')
        })

        test('clicking the button a second time closes the dialog', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()
            const button = screen.getByRole('button', { name: /view terms of use/i })

            await user.click(button)
            expect(screen.getByRole('dialog')).toBeInTheDocument()

            await user.click(button)
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })

        test('the close (✕) button inside the dialog dismisses it', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()

            await user.click(screen.getByRole('button', { name: /view terms of use/i }))
            await user.click(screen.getByRole('button', { name: /close/i }))

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })

        test('pressing Escape closes the dialog', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()

            await user.click(screen.getByRole('button', { name: /view terms of use/i }))
            expect(screen.getByRole('dialog')).toBeInTheDocument()

            await user.keyboard('{Escape}')
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })

        test('a mousedown event outside the component closes the dialog', async () => {
            render(
                <div>
                    <EthicalUseFlagBadge />
                    <div data-testid="outside">outside content</div>
                </div>
            )
            const user = userEvent.setup()

            await user.click(screen.getByRole('button', { name: /view terms of use/i }))
            expect(screen.getByRole('dialog')).toBeInTheDocument()

            // The component listens for `mousedown` on the document.
            fireEvent.mouseDown(screen.getByTestId('outside'))
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })

        test('a mousedown event inside the dialog does not close it', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()

            await user.click(screen.getByRole('button', { name: /view terms of use/i }))
            const dialog = screen.getByRole('dialog')

            fireEvent.mouseDown(dialog)
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
    })

    describe('dialog accessibility', () => {
        test('aria-controls on the button matches the id of the rendered dialog', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()
            const button = screen.getByRole('button', { name: /view terms of use/i })
            const controlledId = button.getAttribute('aria-controls')

            await user.click(button)

            expect(screen.getByRole('dialog')).toHaveAttribute('id', controlledId)
        })

        test('dialog has aria-modal set to false (it is a popover, not a blocking modal)', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()

            await user.click(screen.getByRole('button', { name: /view terms of use/i }))

            expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false')
        })
    })

    describe('dialog content', () => {
        test('dialog contains a link to the Ethical Use License pointing to TERMS_URL', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()
            await user.click(screen.getByRole('button', { name: /view terms of use/i }))

            const link = screen.getByRole('link', { name: /ethical use license/i })
            expect(link).toHaveAttribute('href', TERMS_URL)
            expect(link).toHaveAttribute('target', '_blank')
            expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        })

        test('dialog contains a link to the European Parliament resolution', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()
            await user.click(screen.getByRole('button', { name: /view terms of use/i }))

            const link = screen.getByRole('link', { name: /russia is a terrorist state/i })
            expect(link).toHaveAttribute('href', expect.stringContaining('europarl.europa.eu'))
            expect(link).toHaveAttribute('target', '_blank')
            expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        })

        test('conditions list renders all six items', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()
            await user.click(screen.getByRole('button', { name: /view terms of use/i }))

            const list = screen.getByRole('list')
            expect(list.querySelectorAll('li')).toHaveLength(6)
        })

        test('forbidden-citizens condition is visually highlighted in red', async () => {
            render(<EthicalUseFlagBadge />)
            const user = userEvent.setup()
            await user.click(screen.getByRole('button', { name: /view terms of use/i }))

            const forbiddenText = screen.getByText(/citizens\/residents of russia/i)
            expect(forbiddenText.closest('li')).toHaveClass('text-red-500')
        })
    })
})
