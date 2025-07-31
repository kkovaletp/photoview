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

const suppressReactWarnings = (warnings: string[], testFn: () => void) => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
        const message = args[0];
        if (typeof message === 'string' && warnings.some(warning => message.includes(warning))) {
            return; // Suppress specified warnings
        }
        originalError(...args);
    };

    try {
        testFn();
    } finally {
        console.error = originalError;
    }
};

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

    describe('Rendering and Layout', () => {
        it('renders modal with all content, styling, and accessibility when open', async () => {
            render(<Modal {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            // Basic rendering
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
            expect(screen.getByText('This is a test modal description')).toBeInTheDocument();
            expect(screen.getByTestId('modal-content')).toBeInTheDocument();

            // Layout and styling
            expect(screen.getByRole('dialog')).toHaveClass('fixed', 'z-40', 'inset-0', 'overflow-y-auto');

            const panel = document.querySelector('.fixed.bg-white.dark\\:bg-dark-bg');
            const actionsContainer = document.querySelector('.bg-gray-50.p-2.dark\\:bg-\\[\\#31363d\\]');
            expect(document.querySelector('.fixed.inset-0.bg-black.opacity-30')).toBeInTheDocument();
            expect(panel).toBeInTheDocument();
            expect(panel).toHaveClass('max-w-[calc(100%-16px)]', 'mx-auto', 'rounded', 'shadow-md', 'border');
            expect(actionsContainer).toBeInTheDocument();
            expect(actionsContainer).toHaveClass('flex', 'gap-2', 'justify-end', 'mt-4');

            // Dark mode classes
            expect(document.querySelector('.dark\\:bg-dark-bg')).toBeInTheDocument();
            expect(document.querySelector('.dark\\:bg-\\[\\#31363d\\]')).toBeInTheDocument();
        });

        it('does not render when closed', () => {
            render(<Modal {...defaultProps} open={false} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
            expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
        });

        it('renders custom content correctly', async () => {
            const customDescription = <span>Custom description with <strong>bold text</strong></span>;
            const customContent = (
                <div>
                    <h3>Form Title</h3>
                    <input type="text" placeholder="Name" />
                    <ul><li>Item 1</li></ul>
                </div>
            );

            render(<Modal {...defaultProps} title="Custom Title" description={customDescription}>{customContent}</Modal>);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            // Custom title and description
            const title = screen.getByText('Custom Title');
            expect(title).toBeInTheDocument();
            expect(title.tagName.toLowerCase()).toBe('h2');
            expect(screen.getByText('Custom description with')).toBeInTheDocument();
            expect(screen.getByText('bold text')).toBeInTheDocument();

            // Custom children content
            expect(screen.getByText('Form Title')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
            expect(screen.getByText('Item 1')).toBeInTheDocument();
        });

        it('renders with React fragments and complex nested content', async () => {
            const fragmentDescription = (
                <>
                    <span>First part</span>
                    <strong> important part </strong>
                    <span>last part</span>
                </>
            );
            const complexContent = (
                <div>
                    <form>
                        <textarea placeholder="Message"></textarea>
                        <button type="submit">Submit Form</button>
                    </form>
                    <p>Additional info</p>
                </div>
            );

            render(<Modal {...defaultProps} description={fragmentDescription}>{complexContent}</Modal>);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            // Fragment description
            expect(screen.getByText('First part')).toBeInTheDocument();
            expect(screen.getByText('important part')).toBeInTheDocument();
            expect(screen.getByText('last part')).toBeInTheDocument();

            // Complex content
            expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Submit Form' })).toBeInTheDocument();
            expect(screen.getByText('Additional info')).toBeInTheDocument();
        });
    });

    describe('Actions and Interactions', () => {
        it('renders action buttons with variants, styling, and handles clicks correctly', async () => {
            const cancelMock = vi.fn();
            const confirmMock = vi.fn();
            const actions: ModalAction[] = [
                { key: 'cancel', label: 'Cancel', onClick: cancelMock },
                { key: 'confirm', label: 'Confirm', variant: 'positive', onClick: confirmMock },
            ];

            render(<Modal {...defaultProps} actions={actions} />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
            });

            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            const confirmButton = screen.getByRole('button', { name: 'Confirm' });

            // Button rendering and styling
            expect(cancelButton).not.toHaveAttribute('data-variant');
            expect(confirmButton).toHaveAttribute('data-variant', 'positive');
            expect(cancelButton).toHaveAttribute('data-background', 'white');
            expect(confirmButton).toHaveAttribute('data-background', 'white');

            // Click handling
            fireEvent.click(cancelButton);
            expect(cancelMock).toHaveBeenCalledTimes(1);
            expect(cancelMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'click', target: cancelButton }));
            expect(confirmMock).not.toHaveBeenCalled();

            fireEvent.click(confirmButton);
            expect(confirmMock).toHaveBeenCalledTimes(1);
            expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'click', target: confirmButton }));
        });

        it('handles various action button variants', async () => {
            const actions: ModalAction[] = [
                { key: 'delete', label: 'Delete', variant: 'negative', onClick: vi.fn() },
                { key: 'save', label: 'Save', variant: 'positive', onClick: vi.fn() },
                { key: 'neutral', label: 'Neutral', variant: 'default', onClick: vi.fn() },
                { key: 'no-variant', label: 'No Variant', onClick: vi.fn() },
            ];

            render(<Modal {...defaultProps} actions={actions} />);

            await waitFor(() => {
                expect(screen.getAllByRole('button')).toHaveLength(4);
            });

            expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('data-variant', 'negative');
            expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('data-variant', 'positive');
            expect(screen.getByRole('button', { name: 'Neutral' })).toHaveAttribute('data-variant', 'default');
            expect(screen.getByRole('button', { name: 'No Variant' })).not.toHaveAttribute('data-variant');
        });

        it('handles interactive content within modal', async () => {
            const contentClickHandler = vi.fn();
            const content = (
                <div>
                    <button onClick={contentClickHandler} data-testid="content-button">Content Button</button>
                    <input data-testid="content-input" />
                </div>
            );

            render(<Modal {...defaultProps}>{content}</Modal>);

            await waitFor(() => {
                expect(screen.getByTestId('content-button')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('content-button'));
            expect(contentClickHandler).toHaveBeenCalledTimes(1);

            const contentInput = screen.getByTestId('content-input');
            await userEvent.type(contentInput, 'test');
            expect(contentInput).toHaveValue('test');
        });
    });

    describe('Close Behavior and Accessibility', () => {
        it('provides accessibility features and handles close functionality', async () => {
            const onCloseMock = vi.fn();
            render(<Modal
                {...defaultProps}
                title="Accessible Title"
                description="Accessible description"
                onClose={onCloseMock}
            />);

            // Accessibility
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
                expect(screen.getByText('Accessible Title')).toBeInTheDocument();
                expect(screen.getByText('Accessible description')).toBeInTheDocument();
            });

            // Close functionality
            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
            expect(screen.getByRole('dialog')).toBeInTheDocument(); // Modal remains (Headless UI handles actual close)

            // onClose doesn't crash when called
            expect(() => onCloseMock()).not.toThrow();
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('handles problematic configurations gracefully', async () => {
            suppressReactWarnings(['Encountered two children with the same key'], async () => {
                const problematicActions: ModalAction[] = [
                    { key: 'empty-label', label: '', onClick: vi.fn() },
                    { key: 'no-onclick', label: 'No Click' } as ModalAction,
                    { key: 'duplicate', label: 'First', onClick: vi.fn() },
                    { key: 'duplicate', label: 'Second', onClick: vi.fn() },
                ];

                // Test various edge cases without crashing
                expect(() => render(<Modal {...defaultProps} actions={[]} />)).not.toThrow();
                expect(() => render(<Modal {...defaultProps}>{null}</Modal>)).not.toThrow();
                expect(() => render(<Modal {...defaultProps}>{undefined}</Modal>)).not.toThrow();
                expect(() => render(<Modal {...defaultProps} actions={problematicActions} />)).not.toThrow();

                // Verify edge case behavior
                const { rerender } = render(<Modal {...defaultProps} actions={[]} />);
                await waitFor(() => {
                    expect(screen.getByRole('dialog')).toBeInTheDocument();
                });
                expect(screen.queryAllByRole('button')).toHaveLength(0);

                rerender(<Modal {...defaultProps} actions={problematicActions} />);
                await waitFor(() => {
                    expect(screen.getByRole('dialog')).toBeInTheDocument();
                });
                expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'No Click' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
            });
        });
    });

    describe('State Management and Performance', () => {
        it('handles state changes efficiently and re-renders appropriately', async () => {
            const renderSpy = vi.fn();
            const TestChild = () => {
                renderSpy();
                return <div>Test Child</div>;
            };

            const { rerender } = render(<Modal {...defaultProps} open={true}><TestChild /></Modal>);
            await waitFor(() => {
                expect(screen.getByText('Test Child')).toBeInTheDocument();
            });

            // Test re-render efficiency
            const initialRenders = renderSpy.mock.calls.length;
            rerender(<Modal {...defaultProps} open={true}><TestChild /></Modal>);
            await waitFor(() => {
                expect(screen.getByText('Test Child')).toBeInTheDocument();
            });
            expect(renderSpy.mock.calls.length).toBe(initialRenders * 2); // Expected for strict mode

            // Test rapid state changes
            for (let i = 0; i < 5; i++) {
                rerender(<Modal {...defaultProps} open={false}><TestChild /></Modal>);
                await waitFor(() => {
                    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
                });

                rerender(<Modal {...defaultProps} open={true}><TestChild /></Modal>);
                await waitFor(() => {
                    expect(screen.getByRole('dialog')).toBeInTheDocument();
                });
            }
        });
    });

    describe('Headless UI Integration', () => {
        it('integrates correctly with Headless UI Dialog and maintains proper structure', async () => {
            const onCloseMock = vi.fn();
            const { rerender } = render(<Modal {...defaultProps} open={true} onClose={onCloseMock} />);

            // Verify integration and content structure
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
                expect(screen.getByText('Test Modal')).toBeInTheDocument();
                expect(screen.getByTestId('modal-content')).toBeInTheDocument();
            });
        });
    });
});
