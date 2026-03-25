import { NotificationSubscriptionSubscription } from './__generated__/SubscriptionsHook'
import { Dispatch, SetStateAction, useEffect } from 'react'
import { useSubscription, gql } from '@apollo/client'
import { NotificationType } from '../../__generated__/globalTypes'

const NOTIFICATION_SUBSCRIPTION = gql`
  subscription notificationSubscription {
    notification {
      key
      type
      header
      content
      progress
      positive
      negative
      timeout
    }
  }
`

const messageTimeoutHandles = new Map<string, number>()

export interface Message {
  key: string
  type: NotificationType
  timeout?: number
  timestamp?: number /* milliseconds since epoch */
  onDismiss?: () => void
  props: {
    header: string
    content: string
    negative?: boolean
    positive?: boolean
    percent?: number
  }
}

type SubscriptionHookProps = {
  setMessages: Dispatch<SetStateAction<Message[]>>
}

export const SubscriptionsHook = ({
  setMessages,
}: SubscriptionHookProps) => {
  const { data, error } = useSubscription<NotificationSubscriptionSubscription>(
    NOTIFICATION_SUBSCRIPTION
  )

  useEffect(() => {
    if (error) {
      setMessages(prev => [
        ...prev,
        {
          key: `download-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          type: NotificationType.Message,
          props: {
            header: 'Network error',
            content: error.message,
            negative: true,
          },
        },
      ])
    }
    if (!data) return
    const msg = data.notification
    // Handle timeouts independent of outer "messages"
    if (msg.timeout) {
      const existing = messageTimeoutHandles.get(msg.key)
      if (existing) clearTimeout(existing)
      const timeoutHandle = setTimeout(() => {
        setMessages(prev => prev.filter(m => m.key !== msg.key))
      }, msg.timeout) as unknown as number
      messageTimeoutHandles.set(msg.key, timeoutHandle)
    }
    setMessages(prev => {
      if (msg.type === 'Close') {
        return prev.filter(m => m.key != msg.key)
      }
      const newNotification: Message = {
        key: msg.key,
        type: msg.type,
        timeout: msg.timeout || undefined,
        props: {
          header: msg.header,
          content: msg.content,
          negative: msg.negative,
          positive: msg.positive,
          percent: msg.progress ?? undefined,
        },
      }
      const next = [...prev]
      const i = next.findIndex(m => m.key === newNotification.key)
      if (i === -1) next.push(newNotification)
      else next[i] = newNotification
      return next
    })
  }, [data, error, setMessages])

  return null
}

export default SubscriptionsHook
