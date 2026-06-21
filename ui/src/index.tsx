import { createRoot } from 'react-dom/client'
import App from './App'
import client from './apolloClient'
import { ApolloProvider } from '@apollo/client'
import { BrowserRouter as Router } from 'react-router'
import { setupLocalization } from './localization'
import { updateTheme } from './theme'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'
import i18n from 'i18next'

import './index.css'
import { SidebarProvider } from './components/sidebar/Sidebar'
import { MessageProvider } from './components/messages/MessageState'
import { globalMessageHandler } from './components/messages/globalMessageHandler'
import { NotificationType } from './__generated__/globalTypes'

updateTheme()
setupLocalization()

// Listen for the RELOAD_PAGE broadcast the service worker sends to all
// controlled clients after skipWaiting() completes. Registered here so
// every open Photoview tab reloads together when any one tab triggers an update.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener(
    'message',
    (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'RELOAD_PAGE') {
        globalThis.location.reload()
      }
    }
  )
}

const Main = () => (
  <ApolloProvider client={client}>
    <Router basename={import.meta.env.BASE_URL}>
      <MessageProvider>
        <SidebarProvider>
          <App />
        </SidebarProvider>
      </MessageProvider>
    </Router>
  </ApolloProvider>
)

const root = createRoot(document.getElementById('root')!)
root.render(<Main />)

serviceWorkerRegistration.register({
  onUpdate: (registration: ServiceWorkerRegistration) => {
    if (!registration.waiting) return

    globalMessageHandler.add({
      key: 'app-update-available',
      type: NotificationType.Message,
      props: {
        header: i18n.t('service_worker.update_available.header', 'Photoview version update available'),
        content: i18n.t(
          'service_worker.update_available.content',
          'A new version of Photoview is available on the server. Click "Update" to reload all Photoview tabs and apply the update. Or close this message to continue using the current version and reload manually later.'),
        positive: true,
        actionLabel: i18n.t('service_worker.update_available.action', 'Update'),
        onAction: () => {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        },
      },
    })
  },
})
