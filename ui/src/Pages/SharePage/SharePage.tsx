import { gql, type TypedDocumentNode } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { Route, Routes, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import {
  getSharePassword,
  clearSharePassword,
  saveSharePassword,
} from '../../helpers/authentication'
import { isNil } from '../../helpers/utils'
import { Button } from '../../primitives/form/Input'
import { reloadSharePage } from './reloadSharePage'
import AlbumSharePage from './AlbumSharePage'
import MediaSharePage from './MediaSharePage'
import PasswordProtectedShare from './PasswordProtectedShare'
import {
  SharePageTokenQuery,
  SharePageTokenQueryVariables,
  ShareTokenValidatePasswordQuery,
  ShareTokenValidatePasswordQueryVariables,
} from './__generated__/SharePage'

export const SHARE_TOKEN_QUERY: TypedDocumentNode<
  SharePageTokenQuery,
  SharePageTokenQueryVariables
> = gql`
  query SharePageToken($token: String!, $password: String) {
    shareToken(credentials: { token: $token, password: $password }) {
      token
      hasPassword
      album {
        id
      }
      media {
        id
        title
        type
        thumbnail {
          url
          width
          height
        }
        downloads {
          title
          mediaUrl {
            url
            width
            height
            fileSize
          }
        }
        highRes {
          url
          width
          height
        }
        videoWeb {
          url
          width
          height
        }
        exif {
          id
          description
          camera
          maker
          lens
          dateShot
          exposure
          aperture
          iso
          focalLength
          flash
          exposureProgram
          coordinates {
            longitude
            latitude
          }
        }
      }
    }
  }
`

export const VALIDATE_TOKEN_PASSWORD_QUERY: TypedDocumentNode<
  ShareTokenValidatePasswordQuery,
  ShareTokenValidatePasswordQueryVariables
> = gql`
  query ShareTokenValidatePassword($token: String!, $password: String) {
    shareTokenValidatePassword(
      credentials: { token: $token, password: $password }
    )
  }
`

const useTokenFromParams = () => {
  const { token } = useParams()
  if (isNil(token) || token.trim() === '') throw new Error('Expected `token` param to be defined')
  return token
}

const handleLogout = (token: string) => {
  clearSharePassword(token)
  reloadSharePage()
}

type SharedSubAlbumPageProps = {
  token: string
  password: string | null
  headerAction?: ReactNode
}

const SharedSubAlbumPage = ({
  token,
  password,
  headerAction,
}: SharedSubAlbumPageProps) => {
  const { subAlbum } = useParams()
  if (isNil(subAlbum)) throw new Error('Expected `subAlbum` param to be defined')

  return (
    <AlbumSharePage
      albumID={subAlbum}
      token={token}
      password={password}
      headerAction={headerAction}
    />
  )
}

const AuthorizedTokenRoute = () => {
  const { t } = useTranslation()

  const token = useTokenFromParams()
  const password = getSharePassword(token) ?? null

  const { loading, error, data } = useQuery(SHARE_TOKEN_QUERY, {
    variables: {
      token,
      password,
    },
  })

  if (!isNil(error)) return <div>{error.message || 'An unknown error occurred'}</div>
  if (loading) {
    return <div aria-label={t('general.loading.default', 'Loading...')}>
      {t('general.loading.default', 'Loading...')}
    </div>
  }

  const headerAction = data?.shareToken?.hasPassword ? (
    <Button className="min-h-11 px-3" onClick={() => handleLogout(token)}>
      {t('settings.logout', 'Log out')}
    </Button>
  ) : null

  if (data?.shareToken?.album) {
    return (
      <Routes>
        <Route
          path=":subAlbum"
          element={
            <SharedSubAlbumPage
              token={token}
              password={password}
              headerAction={headerAction}
            />
          }
        />
        <Route
          index
          element={
            <AlbumSharePage
              albumID={data.shareToken.album.id}
              token={token}
              password={password}
              headerAction={headerAction}
            />
          }
        />
      </Routes>
    )
  }

  if (data?.shareToken?.media) {
    return (
      <MediaSharePage
        media={data.shareToken.media}
        headerAction={headerAction}
      />
    )
  }

  return <h1>{t('share_page.share_not_found', 'Share not found')}</h1>
}

export const MessageContainer = styled.div`
  max-width: 400px;
  margin: 100px auto 0;
`

export const TokenRoute = () => {
  const { t } = useTranslation()
  const token = useTokenFromParams()

  const { loading, error, data, refetch } = useQuery(VALIDATE_TOKEN_PASSWORD_QUERY, {
    notifyOnNetworkStatusChange: true,
    variables: {
      token: token,
      password: getSharePassword(token),
    },
  })

  if (error) {
    if (error.message === 'GraphQL error: share not found') {
      return (
        <MessageContainer>
          <h1>{t('share_page.share_not_found', 'Share not found')}</h1>
          <p>
            {t(
              'share_page.share_not_found_description',
              'Maybe the share has expired or has been deleted.'
            )}
          </p>
        </MessageContainer>
      )
    }

    return <div>{error.message}</div>
  }

  if (loading && data === undefined) {
    return <div aria-label={t('general.loading.default', 'Loading...')}>
      {t('general.loading.default', 'Loading...')}
    </div>
  }

  if (!data?.shareTokenValidatePassword) {
    return (
      <PasswordProtectedShare
        refetchWithPassword={password => {
          saveSharePassword(token, password)
          void refetch({ token, password }).catch((error: unknown) => {
            console.error('Failed to validate share password', error)
          })
        }}
        loading={loading}
      />
    )
  }

  if (loading) {
    return <div aria-label={t('general.loading.default', 'Loading...')}>
      {t('general.loading.default', 'Loading...')}
    </div>
  }

  return <AuthorizedTokenRoute />
}
