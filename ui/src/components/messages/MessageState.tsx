import { createContext, useContext, useState, ReactNode, useEffect, useMemo, Dispatch, SetStateAction } from 'react'
import { Message } from './SubscriptionsHook'
import { globalMessageHandler } from './globalMessageHandler'

type MessageContextType = {
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
  add: (message: Message) => void
  removeKey: (key: string) => void
}

const MessageContext = createContext<MessageContextType | undefined>(undefined)

export const useMessageState = (): MessageContextType => {
  const context = useContext(MessageContext)
  if (context === undefined) {
    throw new Error('useMessageState was called outside of MessageProvider. Ensure it is used within MessageProvider.')
  }
  return context
}

type MessageProviderProps = {
  children: ReactNode
}

export const MessageProvider = ({ children }: MessageProviderProps) => {
  const [messages, setMessages] = useState<Message[]>([])

  const add = (message: Message) => {
    const timestampedMessage = { ...message, timestamp: Date.now() };
    setMessages((prevMessages) => [...prevMessages, timestampedMessage])
  }

  const removeKey = (key: string) => {
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.key !== key))
  }

  // Initialize global message handler with React state functions
  useEffect(() => {
    globalMessageHandler.initialize({ add, removeKey })
  }, [])

  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in ms
  const MESSAGE_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours in ms

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setMessages((prevMessages) => {
        const cutoff = Date.now() - MESSAGE_LIFETIME

        return prevMessages.filter((msg) => (msg.timestamp ?? 0) > cutoff);
      });
    }, CLEANUP_INTERVAL);

    return () => clearInterval(cleanupInterval);
  }, []);

  const contextValue = useMemo(
    () => ({ messages, setMessages, add, removeKey }),
    [messages, setMessages, add, removeKey]
  );

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  )
}
