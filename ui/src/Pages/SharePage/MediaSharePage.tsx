import { useContext, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import Layout from '../../components/layout/Layout'
import {
  ProtectedImage,
  ProtectedVideo,
} from '../../components/photoGallery/ProtectedMedia'
import InfoIcon from '../../components/photoGallery/presentView/icons/Info'
import { SidebarContext } from '../../components/sidebar/Sidebar'
import MediaSidebar from '../../components/sidebar/MediaSidebar/MediaSidebar'
import { buttonStyles } from '../../primitives/form/Input'
import { exhaustiveCheck, tailwindClassNames } from '../../helpers/utils'
import { SharePageTokenQuery } from './__generated__/SharePage'
import { MediaType } from '../../__generated__/globalTypes'

const DisplayPhoto = styled(ProtectedImage)`
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
`

const DisplayVideo = styled(ProtectedVideo)`
  max-width: 100%;
  max-height: 80vh;
`

type MediaViewProps = {
  media: NonNullable<SharePageTokenQuery['shareToken']['media']>
}

const MediaView = ({ media }: MediaViewProps) => {
  const { t } = useTranslation()
  const {
    updateSidebar,
    setPinned,
    content: sidebarContent,
    owner: sidebarOwner,
  } = useContext(SidebarContext)

  const [owner] = useState(() => Symbol('MediaSharePageSidebar'))
  const sidebarInitialized = useRef(false)
  const sidebarOpen = sidebarContent !== null
  const ownsSidebar = sidebarOpen && sidebarOwner === owner

  useEffect(() => {
    if (!sidebarInitialized.current) {
      sidebarInitialized.current = true
      updateSidebar(<MediaSidebar media={media} hidePreview />, owner)
      setPinned(window.innerWidth >= 1024)
    } else if (ownsSidebar) {
      // Refresh the details without changing the user's pin choice.
      updateSidebar(<MediaSidebar media={media} hidePreview />, owner)
    }
  }, [media, ownsSidebar, owner, updateSidebar, setPinned])

  useEffect(() => {
    return () => {
      // Reset the ref for React StrictMode's development effect replay.
      sidebarInitialized.current = false
      updateSidebar(null, owner)
    }
  }, [owner, updateSidebar])

  const showMediaInfo = t('sidebar.action.show_media_info', 'Show media info')

  let displayedMedia
  switch (media.type) {
    case MediaType.Photo:
      displayedMedia = <DisplayPhoto src={media.highRes?.url} />
      break
    case MediaType.Video:
      displayedMedia = <DisplayVideo media={media} />
      break
    default:
      return exhaustiveCheck(media.type)
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="min-w-0 font-semibold text-xl">{media.title}</h1>
        <button
          type="button"
          title={showMediaInfo}
          aria-label={showMediaInfo}
          disabled={sidebarOpen}
          className={tailwindClassNames(
            buttonStyles({}),
            'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center px-2 py-2'
          )}
          onClick={() => {
            updateSidebar(<MediaSidebar media={media} hidePreview />, owner)
            setPinned(window.innerWidth >= 1024)
          }}
        >
          <InfoIcon
            aria-hidden="true"
            className="h-5 w-5 [&_g]:stroke-current"
          />
        </button>
      </div>
      {displayedMedia}
    </>
  )
}

type MediaSharePageType = {
  media: NonNullable<SharePageTokenQuery['shareToken']['media']>
}

const MediaSharePage = ({ media }: MediaSharePageType) => {
  const { t } = useTranslation()

  return (
    <Layout title={t('share_page.media.title', 'Shared media')}>
      <div data-testid="MediaSharePage">
        <MediaView key={media.id} media={media} />
      </div>
    </Layout>
  )
}

export default MediaSharePage
