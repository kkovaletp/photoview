import { FunctionComponent } from 'react'
import styled from 'styled-components'
import { authToken } from '../../helpers/authentication'
import MessageProgress from './MessageProgress'
import MessagePlain from './Message'
import { SubscriptionsHook, Message } from './SubscriptionsHook'
import { NotificationType } from '../../__generated__/globalTypes'
import { useMessageState, MessageProvider } from './MessageState'

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

const Messages = () => {
  const { messages, setMessages } = useMessageState()

  const getMessageElement = (message: Message): FunctionComponent => {
    const dismissMessage = (message: Message) => {
      message.onDismiss?.()
      setMessages(prevMessages => prevMessages.filter(msg => msg.key != message.key))
    }

    switch (message.type) {
      case NotificationType.Message:
        return props => (
          <MessagePlain
            onDismiss={() => {
              dismissMessage(message)
            }}
            {...message.props}
            {...props}
          />
        )
      case NotificationType.Progress:
        return props => (
          <MessageProgress
            onDismiss={() => {
              dismissMessage(message)
            }}
            {...message.props}
            {...props}
          />
        )
      default:
        throw new Error(`Invalid message type: ${message.type}`)
    }
  }

  const messageElems = messages.map(msg => {
    const Elem = getMessageElement(msg)
    return (
      <div key={msg.key}>
        <Elem />
      </div>
    )
  })

  return (
    <Container>
      {messageElems}
      {authToken() && (
        <SubscriptionsHook messages={messages} setMessages={setMessages} />
      )}
    </Container>
  )
}

const MessagesWithProvider = () => (
  <MessageProvider>
    <Messages />
  </MessageProvider>
)

export { Messages }
export default MessagesWithProvider
