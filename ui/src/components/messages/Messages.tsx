import styled from 'styled-components'
import { authToken } from '../../helpers/authentication'
import MessageProgress from './MessageProgress'
import MessagePlain from './Message'
import { SubscriptionsHook, Message } from './SubscriptionsHook'
import { NotificationType } from '../../__generated__/globalTypes'
import { useMessageState } from './MessageState'

const Container = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 500px;
  max-height: calc(100vh - 40px); // Ensures the container doesn't overflow the viewport height
  overflow-y: auto; // Allows scrolling if there are multiple lines

  @media (max-width: 1000px) {
    display: none;
  }
`

type MessageItemProps = {
  message: Message
  onDismiss: (message: Message) => void
}

const MessageItem = ({ message, onDismiss }: MessageItemProps) => {
  switch (message.type) {
    case NotificationType.Message:
      return (
        <MessagePlain
          onDismiss={() => onDismiss(message)}
          {...message.props}
        />
      )
    case NotificationType.Progress:
      return (
        <MessageProgress
          onDismiss={() => onDismiss(message)}
          {...message.props}
        />
      )
    default:
      console.error('Unknown message type encountered for message key: ' + message.key)
      return null
  }
}

const Messages = () => {
  const { messages, setMessages } = useMessageState()

  const dismissMessage = (message: Message) => {
    message.onDismiss?.()
    setMessages(prevMessages => prevMessages.filter(msg => msg.key !== message.key))
  }
  const messageElems = messages.map(msg => (
    <MessageItem key={msg.key} message={msg} onDismiss={dismissMessage} />
  ))

  return (
    <Container>
      {messageElems}
      {authToken() && (
        <SubscriptionsHook setMessages={setMessages} />
      )}
    </Container>
  )
}

const MessagesWithoutProvider = () => <Messages />

export { Messages }
export default MessagesWithoutProvider
