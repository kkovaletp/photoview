import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useMatch } from 'react-router'
import { HelmetProvider, Helmet } from '@dr.pogodin/react-helmet'
import Routes from './components/routes/Routes'
import Messages from './components/messages/Messages'
import { useLoadTranslations } from './localization'

const App = () => {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const isLogoutRoute = useMatch('/logout') !== null
  useLoadTranslations(!isLogoutRoute)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (document.activeElement !== document.body)
      (document.activeElement as HTMLInputElement).blur()
  }, [pathname])

  return (
    <>
      <HelmetProvider>
        <Helmet>
          <meta
            name="description"
            content={t(
              'meta.description',
              'Simple and User-friendly Photo Gallery for Personal Servers'
            )}
          />
        </Helmet>
      </HelmetProvider>
      <Routes />
      <Messages />
    </>
  )
}

export default App
