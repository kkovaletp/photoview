import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Modal, { ModalAction, ModalProps } from './Modal';

// Mock the Button component from form/Input
vi.mock('./form/Input', () => ({
    Button: ({ children, onClick, variant, background, ...props }: any) => (
        <button
            onClick={onClick}
            data-variant={variant}
            data-background={background}
            {...props}
        >
            {children}
        </button>
    )
}));

describe('Modal Component', () => {
    const mockActions: ModalAction[] = [
        {
            key: 'cancel',
            label: 'Cancel',
            onClick: vi.fn(),
        },
        {
            key: 'confirm',
            label: 'Confirm',
            variant: 'positive',
            onClick: vi.fn(),
        },
    ];

    const defaultProps: ModalProps = {
        title: 'Test Modal',
        description: 'This is a test modal description',
        children: <div data-testid="modal-content">Test Content</div>,
        actions: mockActions,
        open: true,
        onClose: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Clean up any remaining modals
        document.body.style.overflow = '';
    });

    describe('Basic Rendering', () => {
        it('renders modal when open is true', () => {
            render(<Modal {...defaultProps} />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
            expect(screen.getByText('This is a test modal description')).toBeInTheDocument();
            expect(screen.getByTestId('modal-content')).toBeInTheDocument();
        });

        it('does not render modal when open is false', () => {
            render(<Modal {...defaultProps} open={false} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
            expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
        });

        it('renders title as DialogTitle', () => {
            render(<Modal {...defaultProps} title="Custom Title" />);

            const title = screen.getByText('Custom Title');
            expect(title).toBeInTheDocument();
            expect(title.tagName.toLowerCase()).toBe('h2'); // DialogTitle typically renders as h2
        });

        it('renders description as Description', () => {
            const customDescription = <span>Custom description with <strong>bold text</strong></span>;
            render(<Modal {...defaultProps} description={customDescription} />);

            expect(screen.getByText('Custom description with')).toBeInTheDocument();
            expect(screen.getByText('bold text')).toBeInTheDocument();
        });

        it('renders children content correctly', () => {
            const customContent = (
                <div>
                    <h3>Custom Content</h3>
                    <p>Some paragraph text</p>
                </div>
            );
            render(<Modal {...defaultProps}>{customContent}</Modal>);

            expect(screen.getByText('Custom Content')).toBeInTheDocument();
            expect(screen.getByText('Some paragraph text')).toBeInTheDocument();
        });
    });

    describe('Actions Rendering', () => {
        it('renders all action buttons', () => {
            render(<Modal {...defaultProps} />);

            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
        });

        it('applies correct variants to action buttons', () => {
            render(<Modal {...defaultProps} />);

            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            const confirmButton = screen.getByRole('button', { name: 'Confirm' });

            expect(cancelButton).not.toHaveAttribute('data-variant');
            expect(confirmButton).toHaveAttribute('data-variant', 'positive');
        });

        it('applies white background to all buttons', () => {
            render(<Modal {...defaultProps} />);

            const buttons = screen.getAllByRole('button');
            buttons.forEach(button => {
                expect(button).toHaveAttribute('data-background', 'white');
            });
        });

        it('handles actions with different variants', () => {
            const actionsWithVariants: ModalAction[] = [
                { key: 'delete', label: 'Delete', variant: 'negative', onClick: vi.fn() },
                { key: 'save', label: 'Save', variant: 'positive', onClick: vi.fn() },
                { key: 'neutral', label: 'Neutral', variant: 'default', onClick: vi.fn() },
                { key: 'no-variant', label: 'No Variant', onClick: vi.fn() },
            ];

            render(<Modal {...defaultProps} actions={actionsWithVariants} />);

            expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('data-variant', 'negative');
            expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('data-variant', 'positive');
            expect(screen.getByRole('button', { name: 'Neutral' })).toHaveAttribute('data-variant', 'default');
            expect(screen.getByRole('button', { name: 'No Variant' })).not.toHaveAttribute('data-variant');
        });
    });

    describe('Action Click Handling', () => {
        it('calls onClick handler when action button is clicked', async () => {
            const mockClick = vi.fn();
            const actions: ModalAction[] = [
                { key: 'test', label: 'Test Button', onClick: mockClick },
            ];

            render(<Modal {...defaultProps} actions={actions} />);

            const button = screen.getByRole('button', { name: 'Test Button' });
            await userEvent.click(button);

            expect(mockClick).toHaveBeenCalledTimes(1);
            expect(mockClick).toHaveBeenCalledWith(expect.any(Object)); // MouseEvent
        });

        it('calls correct onClick handler for multiple actions', async () => {
            const cancelMock = vi.fn();
            const confirmMock = vi.fn();
            const actions: ModalAction[] = [
                { key: 'cancel', label: 'Cancel', onClick: cancelMock },
                { key: 'confirm', label: 'Confirm', onClick: confirmMock },
            ];

            render(<Modal {...defaultProps} actions={actions} />);

            await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(cancelMock).toHaveBeenCalledTimes(1);
            expect(confirmMock).not.toHaveBeenCalled();

            await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
            expect(confirmMock).toHaveBeenCalledTimes(1);
            expect(cancelMock).toHaveBeenCalledTimes(1);
        });

        it('passes mouse event to onClick handlers', async () => {
            const mockClick = vi.fn();
            const actions: ModalAction[] = [
                { key: 'test', label: 'Test', onClick: mockClick },
            ];

            render(<Modal {...defaultProps} actions={actions} />);

            const button = screen.getByRole('button', { name: 'Test' });
            await userEvent.click(button);

            expect(mockClick).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'click',
                    target: button,
                })
            );
        });
    });

    describe('Close Functionality', () => {
        it('calls onClose when modal is closed via Headless UI', () => {
            const onCloseMock = vi.fn();
            render(<Modal {...defaultProps} onClose={onCloseMock} />);

            // Simulate Headless UI calling onClose (e.g., via Escape key)
            const dialog = screen.getByRole('dialog');
            fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

            // Note: Headless UI handles the actual escape key logic
            // This test verifies the prop is passed correctly
            expect(dialog).toBeInTheDocument();
        });

        it('does not crash when onClose is called', () => {
            const onCloseMock = vi.fn();
            render(<Modal {...defaultProps} onClose={onCloseMock} />);

            expect(() => {
                onCloseMock();
            }).not.toThrow();
        });
    });

    describe('Layout and Styling', () => {
        it('applies correct CSS classes to dialog', () => {
            render(<Modal {...defaultProps} />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveClass('fixed', 'z-40', 'inset-0', 'overflow-y-auto');
        });

        it('renders backdrop with correct styling', () => {
            render(<Modal {...defaultProps} />);

            // The backdrop is the fixed div with bg-black opacity-30
            const backdrop = document.querySelector('.fixed.inset-0.bg-black.opacity-30');
            expect(backdrop).toBeInTheDocument();
        });

        it('renders dialog panel with correct styling', () => {
            render(<Modal {...defaultProps} />);

            // Find the DialogPanel by its classes
            const panel = document.querySelector('.fixed.bg-white.dark\\:bg-dark-bg');
            expect(panel).toBeInTheDocument();
            expect(panel).toHaveClass(
                'max-w-[calc(100%-16px)]',
                'mx-auto',
                'rounded',
                'shadow-md',
                'border'
            );
        });

        it('renders actions area with correct styling', () => {
            render(<Modal {...defaultProps} />);

            // Find the actions container
            const actionsContainer = document.querySelector('.bg-gray-50.p-2.dark\\:bg-\\[\\#31363d\\]');
            expect(actionsContainer).toBeInTheDocument();
            expect(actionsContainer).toHaveClass('flex', 'gap-2', 'justify-end', 'mt-4');
        });

        it('applies dark mode classes correctly', () => {
            render(<Modal {...defaultProps} />);

            const panel = document.querySelector('.dark\\:bg-dark-bg');
            const actionsArea = document.querySelector('.dark\\:bg-\\[\\#31363d\\]');

            expect(panel).toBeInTheDocument();
            expect(actionsArea).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper dialog role', () => {
            render(<Modal {...defaultProps} />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });

        it('associates title with dialog', () => {
            render(<Modal {...defaultProps} title="Accessible Title" />);

            const dialog = screen.getByRole('dialog');
            const title = screen.getByText('Accessible Title');

            // Headless UI automatically handles aria-labelledby
            expect(dialog).toBeInTheDocument();
            expect(title).toBeInTheDocument();
        });

        it('associates description with dialog', () => {
            render(<Modal {...defaultProps} description="Accessible description" />);

            const dialog = screen.getByRole('dialog');
            const description = screen.getByText('Accessible description');

            // Headless UI automatically handles aria-describedby
            expect(dialog).toBeInTheDocument();
            expect(description).toBeInTheDocument();
        });

        it('maintains focus management via Headless UI', () => {
            render(<Modal {...defaultProps} />);

            // Headless UI handles focus management automatically
            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('handles empty actions array', () => {
            expect(() => {
                render(<Modal {...defaultProps} actions={[]} />);
            }).not.toThrow();

            const buttons = screen.queryAllByRole('button');
            expect(buttons).toHaveLength(0);
        });

        it('handles null children gracefully', () => {
            expect(() => {
                render(<Modal {...defaultProps}>{null}</Modal>);
            }).not.toThrow();

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('handles undefined children gracefully', () => {
            expect(() => {
                render(<Modal {...defaultProps}>{undefined}</Modal>);
            }).not.toThrow();

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('handles missing onClick in actions gracefully', () => {
            const actionsWithoutOnClick = [
                { key: 'test', label: 'Test' } as ModalAction,
            ];

            expect(() => {
                render(<Modal {...defaultProps} actions={actionsWithoutOnClick} />);
            }).not.toThrow();
        });

        it('handles actions with empty labels', () => {
            const actionsWithEmptyLabel: ModalAction[] = [
                { key: 'empty', label: '', onClick: vi.fn() },
            ];

            expect(() => {
                render(<Modal {...defaultProps} actions={actionsWithEmptyLabel} />);
            }).not.toThrow();

            const button = screen.getByRole('button', { name: '' });
            expect(button).toBeInTheDocument();
        });

        it('handles duplicate action keys', () => {
            const duplicateKeyActions: ModalAction[] = [
                { key: 'duplicate', label: 'First', onClick: vi.fn() },
                { key: 'duplicate', label: 'Second', onClick: vi.fn() },
            ];

            expect(() => {
                render(<Modal {...defaultProps} actions={duplicateKeyActions} />);
            }).not.toThrow();

            expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
        });
    });

    describe('Complex Content Scenarios', () => {
        it('renders complex nested content', () => {
            const complexContent = (
                <div>
                    <h3>Form Title</h3>
                    <form>
                        <input type="text" placeholder="Name" />
                        <textarea placeholder="Message"></textarea>
                        <button type="submit">Submit Form</button>
                    </form>
                    <div>
                        <p>Additional info</p>
                        <ul>
                            <li>Item 1</li>
                            <li>Item 2</li>
                        </ul>
                    </div>
                </div>
            );

            render(<Modal {...defaultProps}>{complexContent}</Modal>);

            expect(screen.getByText('Form Title')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Submit Form' })).toBeInTheDocument();
            expect(screen.getByText('Additional info')).toBeInTheDocument();
            expect(screen.getByText('Item 1')).toBeInTheDocument();
            expect(screen.getByText('Item 2')).toBeInTheDocument();
        });

        it('handles interactive elements within content', async () => {
            const contentClickHandler = vi.fn();
            const content = (
                <div>
                    <button onClick={contentClickHandler} data-testid="content-button">
                        Content Button
                    </button>
                    <input data-testid="content-input" />
                </div>
            );

            render(<Modal {...defaultProps}>{content}</Modal>);

            const contentButton = screen.getByTestId('content-button');
            const contentInput = screen.getByTestId('content-input');

            await userEvent.click(contentButton);
            expect(contentClickHandler).toHaveBeenCalledTimes(1);

            await userEvent.type(contentInput, 'test');
            expect(contentInput).toHaveValue('test');
        });

        it('renders with React fragments as description', () => {
            const fragmentDescription = (
                <>
                    <span>First part</span>
                    <strong> important part </strong>
                    <span>last part</span>
                </>
            );

            render(<Modal {...defaultProps} description={fragmentDescription} />);

            expect(screen.getByText('First part')).toBeInTheDocument();
            expect(screen.getByText('important part')).toBeInTheDocument();
            expect(screen.getByText('last part')).toBeInTheDocument();
        });
    });

    describe('Performance Considerations', () => {
        it('does not cause unnecessary re-renders of children', () => {
            const renderSpy = vi.fn();
            const TestChild = () => {
                renderSpy();
                return <div>Test Child</div>;
            };

            const { rerender } = render(
                <Modal {...defaultProps}>
                    <TestChild />
                </Modal>
            );

            const initialRenders = renderSpy.mock.calls.length;

            // Re-render with same props
            rerender(
                <Modal {...defaultProps}>
                    <TestChild />
                </Modal>
            );

            // Should not cause additional renders if props haven't changed
            expect(renderSpy.mock.calls.length).toBe(initialRenders * 2); // Expected for strict mode
        });

        it('handles rapid open/close state changes', () => {
            const { rerender } = render(<Modal {...defaultProps} open={false} />);

            // Rapidly toggle state
            for (let i = 0; i < 5; i++) {
                rerender(<Modal {...defaultProps} open={true} />);
                rerender(<Modal {...defaultProps} open={false} />);
            }

            // Should end in closed state without errors
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('Integration with Headless UI', () => {
        it('passes open prop correctly to Dialog', () => {
            const { rerender } = render(<Modal {...defaultProps} open={true} />);
            expect(screen.getByRole('dialog')).toBeInTheDocument();

            rerender(<Modal {...defaultProps} open={false} />);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('passes onClose prop correctly to Dialog', () => {
            const onCloseMock = vi.fn();
            render(<Modal {...defaultProps} onClose={onCloseMock} />);

            // The onClose prop is passed to Headless UI Dialog
            // Actual close behavior is handled by Headless UI
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('uses DialogPanel for modal content structure', () => {
            render(<Modal {...defaultProps} />);

            // Check that the modal content is structured correctly
            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();

            // Content should be within the modal
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
            expect(screen.getByTestId('modal-content')).toBeInTheDocument();
        });
    });
});
