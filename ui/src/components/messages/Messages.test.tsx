import { render, screen, act, fireEvent } from '@testing-library/react'
import { Dispatch, SetStateAction } from 'react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NotificationType } from '../../__generated__/globalTypes'
import { MessageProvider } from './MessageState'
import { Message } from './SubscriptionsHook'
import MessagesWithoutProvider, { Messages } from './Messages'

// ── Hoisted mock factories ─────────────────────────────────────────────────────

const { mockAuthToken } = vi.hoisted(() => ({
  mockAuthToken: vi.fn(),
}))

// ── Capture variable for the setMessages prop passed to SubscriptionsHook ─────
//
// Updated on every render of the mocked SubscriptionsHook so that injectMessages()
// can call the same setter that the component holds internally.

let capturedSetMessages: Dispatch<SetStateAction<Message[]>> | undefined

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('../../helpers/authentication', () => ({
  authToken: mockAuthToken,
}))

vi.mock('./SubscriptionsHook', async importOriginal => {
  // Re-export Message, SubscriptionHookProps, etc. from the real module.
  const real = await importOriginal<typeof import('./SubscriptionsHook')>()

  const MockSubscriptionsHook = ({
    setMessages,
  }: {
    setMessages: Dispatch<SetStateAction<Message[]>>
  }) => {
    capturedSetMessages = setMessages
    return <div data-testid="subscriptions-hook" />
  }

  return {
    ...(real as object),
    SubscriptionsHook: MockSubscriptionsHook,
  }
})

// ── Test helpers ───────────────────────────────────────────────────────────────

/** Build a minimal Message fixture (NotificationType.Message). */
const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  key: 'msg-key-1',
  type: NotificationType.Message,
  props: {
    header: 'Test Header',
    content: 'Test content',
  },
  ...overrides,
})

/** Build a minimal Message fixture (NotificationType.Progress). */
const makeProgressMessage = (overrides: Partial<Message> = {}): Message => ({
  key: 'prog-key-1',
  type: NotificationType.Progress,
  props: {
    header: 'Progress Header',
    content: 'Progress content',
    percent: 50,
  },
  ...overrides,
})

/** Render `Messages` inside the required `MessageProvider`. */
const renderMessages = () =>
  render(
    <MessageProvider>
      <Messages />
    </MessageProvider>
  )

/**
 * Inject messages into the component state by calling the `setMessages`
 * function that was captured from the last render of the mocked
 * `SubscriptionsHook`.
 *
 * Requires `authToken()` to return a truthy value so the hook is mounted.
 */
const injectMessages = (messages: Message[]) => {
  if (!capturedSetMessages) {
    throw new Error(
      'capturedSetMessages is undefined — ensure authToken() returns a truthy ' +
      'value before calling injectMessages() so SubscriptionsHook is mounted.'
    )
  }
  act(() => {
    capturedSetMessages!(() => messages)
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Messages', () => {
  beforeEach(() => {
    mockAuthToken.mockReturnValue('test-auth-token')
    capturedSetMessages = undefined
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Empty state ──────────────────────────────────────────────────────────────

  describe('when the message list is empty', () => {
    it('renders no message headings', () => {
      renderMessages()
      expect(screen.queryByRole('heading')).toBeNull()
    })

    it('renders the SubscriptionsHook when the user is authenticated', () => {
      renderMessages()
      expect(screen.getByTestId('subscriptions-hook')).toBeInTheDocument()
    })

    it('does NOT render the SubscriptionsHook when the user is not authenticated', () => {
      mockAuthToken.mockReturnValue(undefined)
      renderMessages()
      expect(screen.queryByTestId('subscriptions-hook')).not.toBeInTheDocument()
    })
  })

  // ── MessageItem: NotificationType.Message ────────────────────────────────────

  describe('MessageItem — NotificationType.Message', () => {
    it('renders the message header and content', () => {
      renderMessages()
      injectMessages([
        makeMessage({ props: { header: 'Hello world', content: 'Some detail here' } }),
      ])
      expect(screen.getByText('Hello world')).toBeInTheDocument()
      expect(screen.getByText('Some detail here')).toBeInTheDocument()
    })

    it('renders multiple Message-type notifications', () => {
      renderMessages()
      injectMessages([
        makeMessage({ key: 'k1', props: { header: 'First', content: 'first content' } }),
        makeMessage({ key: 'k2', props: { header: 'Second', content: 'second content' } }),
      ])
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })
  })

  // ── MessageItem: NotificationType.Progress ───────────────────────────────────

  describe('MessageItem — NotificationType.Progress', () => {
    it('renders a progress bar with the correct aria value', () => {
      renderMessages()
      injectMessages([
        makeProgressMessage({
          props: { header: 'Uploading', content: 'please wait', percent: 42 },
        }),
      ])
      const bar = screen.getByRole('progressbar')
      expect(bar).toBeInTheDocument()
      expect(bar).toHaveAttribute('aria-valuenow', '42')
    })

    it('renders the progress message header', () => {
      renderMessages()
      injectMessages([makeProgressMessage()])
      expect(screen.getByText('Progress Header')).toBeInTheDocument()
    })
  })

  // ── MessageItem: unknown type ─────────────────────────────────────────────────

  describe('MessageItem — unknown type', () => {
    it('calls console.error and renders nothing for an unrecognised message type', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
      renderMessages()
      injectMessages([makeMessage({ key: 'bad', type: 'UNKNOWN_TYPE' as NotificationType })])

      expect(consoleSpy).toHaveBeenCalledOnce()
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('bad'))
      // No heading should be rendered for the bad message
      expect(screen.queryByText('Test Header')).not.toBeInTheDocument()
      consoleSpy.mockRestore()
    })
  })

  // ── Dismiss behaviour ─────────────────────────────────────────────────────────

  describe('dismiss behaviour', () => {
    it('removes the dismissed message from the list', () => {
      renderMessages()
      injectMessages([makeMessage({ props: { header: 'Goodbye', content: 'soon gone' } })])
      expect(screen.getByText('Goodbye')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /dismiss message/i }))

      expect(screen.queryByText('Goodbye')).not.toBeInTheDocument()
    })

    it('calls message.onDismiss when the message is dismissed', () => {
      const onDismiss = vi.fn()
      renderMessages()
      injectMessages([
        makeMessage({ onDismiss, props: { header: 'Watch me', content: 'content' } }),
      ])

      fireEvent.click(screen.getByRole('button', { name: /dismiss message/i }))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('does not throw when message.onDismiss is undefined', () => {
      renderMessages()
      injectMessages([makeMessage({ props: { header: 'No callback', content: 'safe' } })])

      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /dismiss message/i }))
      ).not.toThrow()
    })

    it('removes only the dismissed message and keeps the others', () => {
      renderMessages()
      injectMessages([
        makeMessage({ key: 'keep', props: { header: 'Keep me', content: 'stay' } }),
        makeMessage({ key: 'drop', props: { header: 'Drop me', content: 'gone' } }),
      ])

      expect(screen.getByText('Keep me')).toBeInTheDocument()
      expect(screen.getByText('Drop me')).toBeInTheDocument()

      // Click the second dismiss button (belongs to "Drop me")
      const buttons = screen.getAllByRole('button', { name: /dismiss message/i })
      expect(buttons).toHaveLength(2)
      fireEvent.click(buttons[1])

      expect(screen.getByText('Keep me')).toBeInTheDocument()
      expect(screen.queryByText('Drop me')).not.toBeInTheDocument()
    })
  })

  // ── Action button ─────────────────────────────────────────────────────────────

  describe('MessageItem — action button', () => {
    it('renders an action button when actionLabel and onAction are provided', () => {
      renderMessages()
      const onAction = vi.fn()
      injectMessages([
        makeMessage({
          props: {
            header: 'Update available',
            content: 'New version ready.',
            positive: true,
            actionLabel: 'Reload now',
            onAction,
          },
        }),
      ])
      expect(screen.getByRole('button', { name: 'Reload now' })).toBeInTheDocument()
    })

    it('calls onAction when the action button is clicked', () => {
      renderMessages()
      const onAction = vi.fn()
      injectMessages([
        makeMessage({
          props: {
            header: 'Update available',
            content: 'New version ready.',
            positive: true,
            actionLabel: 'Reload now',
            onAction,
          },
        }),
      ])
      fireEvent.click(screen.getByRole('button', { name: 'Reload now' }))
      expect(onAction).toHaveBeenCalledTimes(1)
    })

    it('does not render an action button when actionLabel and onAction are absent', () => {
      renderMessages()
      injectMessages([
        makeMessage({ props: { header: 'Plain message', content: 'no button here' } }),
      ])
      // Only the dismiss button should exist
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0]).toHaveAttribute('aria-label', 'Dismiss message')
    })
  })

  // ── setMessages passed to SubscriptionsHook ───────────────────────────────────

  describe('setMessages passed to SubscriptionsHook', () => {
    it('provides a setMessages function to SubscriptionsHook', () => {
      renderMessages()
      expect(capturedSetMessages).toBeTypeOf('function')
    })

    it('the setMessages callback updates the rendered message list', () => {
      renderMessages()
      injectMessages([
        makeMessage({ props: { header: 'Dynamic', content: 'via setMessages' } }),
      ])
      expect(screen.getByText('Dynamic')).toBeInTheDocument()
    })
  })
})

// ── MessagesWithProvider (default export) ─────────────────────────────────────

describe('MessagesWithProvider', () => {
  const renderWithProvider = (ui: React.ReactElement) =>
    render(<MessageProvider>{ui}</MessageProvider>)

  beforeEach(() => {
    mockAuthToken.mockReturnValue('test-auth-token')
    capturedSetMessages = undefined
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing when wrapped in an outer MessageProvider', () => {
    expect(() => renderWithProvider(<MessagesWithoutProvider />)).not.toThrow()
  })

  it('mounts the SubscriptionsHook when authenticated', () => {
    renderWithProvider(<MessagesWithoutProvider />)
    expect(screen.getByTestId('subscriptions-hook')).toBeInTheDocument()
  })

  it('does not mount the SubscriptionsHook when not authenticated', () => {
    mockAuthToken.mockReturnValue(undefined)
    renderWithProvider(<MessagesWithoutProvider />)
    expect(screen.queryByTestId('subscriptions-hook')).not.toBeInTheDocument()
  })

  it('works correctly inside an outer MessageProvider — useMessageState does not throw', () => {
    // This mirrors the production hierarchy: index.tsx provides the
    // MessageProvider; MessagesWithProvider is a plain consumer.
    expect(() => renderWithProvider(<MessagesWithoutProvider />)).not.toThrow()
  })
})
