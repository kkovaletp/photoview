import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useMessageState, MessageProvider } from './MessageState'
import { Message } from './SubscriptionsHook'
import { NotificationType } from '../../__generated__/globalTypes'

describe('MessageState', () => {
    let originalDateNow: () => number

    beforeEach(() => {
        originalDateNow = Date.now
        vi.useFakeTimers()
    })

    afterEach(() => {
        Date.now = originalDateNow
        vi.useRealTimers()
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MessageProvider>{children}</MessageProvider>
    )

    it('should cleanup messages older than 24 hours', () => {
        // Mock current time
        const now = 1643673600000 // 2022-02-01T00:00:00.000Z
        Date.now = vi.fn(() => now)

        const { result } = renderHook(() => useMessageState(), { wrapper })

        // Add messages with different timestamps
        const oldMessage: Message = {
            key: 'old',
            type: NotificationType.Message,
            timestamp: now - 25 * 60 * 60 * 1000, // 25 hours ago
            props: {
                header: 'Old Message',
                content: 'This message is old'
            }
        }
        const recentMessage: Message = {
            key: 'recent',
            type: NotificationType.Message,
            timestamp: now - 23 * 60 * 60 * 1000, // 23 hours ago
            props: {
                header: 'Recent Message',
                content: 'This message is recent'
            }
        }

        result.current.add(oldMessage)
        result.current.add(recentMessage)

        // Advance time by 1 hour to trigger cleanup
        Date.now = vi.fn(() => now + 60 * 60 * 1000)
        vi.advanceTimersByTime(60 * 60 * 1000)

        // Only recent message should remain
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0].key).toBe('recent')
    })

    it('should add timestamp to new messages', () => {
        const now = 1643673600000
        Date.now = vi.fn(() => now)

        const { result } = renderHook(() => useMessageState(), { wrapper })

        const message: Message = {
            key: 'test',
            type: NotificationType.Message,
            props: {
                header: 'Test Message',
                content: 'Test content'
            }
        }

        result.current.add(message)

        expect(result.current.messages[0].timestamp).toBe(now)
    })

    it('should clear interval on unmount', () => {
        const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

        const { unmount } = renderHook(() => useMessageState(), { wrapper })

        // Advance time to ensure interval is set
        vi.advanceTimersByTime(1000)

        unmount()

        expect(clearIntervalSpy).toHaveBeenCalled()
        clearIntervalSpy.mockRestore()
    })

    it('should run cleanup every hour', () => {
        const now = 1643673600000
        Date.now = vi.fn(() => now)

        const { result } = renderHook(() => useMessageState(), { wrapper })

        const message: Message = {
            key: 'test',
            type: NotificationType.Message,
            timestamp: now - 23.5 * 60 * 60 * 1000, // 23.5 hours ago
            props: {
                header: 'Test Message',
                content: 'Test content'
            }
        }

        result.current.add(message)

        // Message should still be present
        expect(result.current.messages).toHaveLength(1)

        // Advance time by 1 hour
        Date.now = vi.fn(() => now + 60 * 60 * 1000)
        vi.advanceTimersByTime(60 * 60 * 1000)

        // Message should still be present (24.5 hours old)
        expect(result.current.messages).toHaveLength(1)

        // Advance time by another hour
        Date.now = vi.fn(() => now + 2 * 60 * 60 * 1000)
        vi.advanceTimersByTime(60 * 60 * 1000)

        // Message should be removed (25.5 hours old)
        expect(result.current.messages).toHaveLength(0)
    })

    it('should handle messages without timestamp', () => {
        const now = 1643673600000
        Date.now = vi.fn(() => now)

        const { result } = renderHook(() => useMessageState(), { wrapper })

        const message: Message = {
            key: 'test',
            type: NotificationType.Message,
            props: {
                header: 'Test Message',
                content: 'Message without timestamp'
            }
        }

        result.current.add(message)

        // Message should be present with auto-added timestamp
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0].timestamp).toBe(now)

        // Advance time by 25 hours
        Date.now = vi.fn(() => now + 25 * 60 * 60 * 1000)
        vi.advanceTimersByTime(60 * 60 * 1000)

        // Message should be removed
        expect(result.current.messages).toHaveLength(0)
    })
})
