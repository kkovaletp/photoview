import { useContext, useEffect } from 'react'
import styled from 'styled-components'
import Layout from '../../components/layout/Layout'
import {
  ProtectedImage,
  ProtectedVideo,
} from '../../components/photoGallery/ProtectedMedia'
import { SidebarContext } from '../../components/sidebar/Sidebar'
import MediaSidebar from '../../components/sidebar/MediaSidebar/MediaSidebar'
import { useTranslation } from 'react-i18next'
import { SharePageTokenQuery } from './__generated__/SharePage'
import { MediaType } from '../../__generated__/globalTypes'
import { exhaustiveCheck } from '../../helpers/utils'

const DisplayPhoto = styled(ProtectedImage)`
  /* width: 100%; */
  max-height: calc(80vh);
  object-fit: contain;
`

const DisplayVideo = styled(ProtectedVideo)`
  /* width: 100%; */
  max-height: calc(80vh);
`

type MediaViewProps = {
  media: SharePageTokenQuery['shareToken']['media']
}

const MediaView = ({ media }: MediaViewProps) => {
  const { updateSidebar } = useContext(SidebarContext)

  useEffect(() => {
    if (typeof updateSidebar === 'function') {
      //TODO: how to fix the "Type 'undefined' is not assignable to type 'MediaSidebarMedia'" error?
      updateSidebar(<MediaSidebar media={media} hidePreview />)
    }
  }, [media, updateSidebar])

  //TODO: how to fix the "'media' is possibly 'null' or 'undefined'" error?
  switch (media.type) {
    case MediaType.Photo:
      //TODO: how to fix the "'media' is possibly 'null' or 'undefined'" error?
      return <DisplayPhoto src={media.highRes?.url} />
    case MediaType.Video:
      //TODO: how to fix the "Type 'undefined' is not assignable to type 'ProtectedVideoPropsMedia'" error?
      return <DisplayVideo media={media} />
    default:
      //TODO: how to fix the "'media' is possibly 'null' or 'undefined'" error?
      return exhaustiveCheck(media.type)
  }
}

type MediaSharePageType = {
  media: SharePageTokenQuery['shareToken']['media']
}

const MediaSharePage = ({ media }: MediaSharePageType) => {
  const { t } = useTranslation()

  return (
    //TODO: how to fix the "'media' is possibly 'null' or 'undefined'" error?
    <Layout title={t('share_page.media.title', 'Shared media')}>
      <div data-testid="MediaSharePage">
        <h1 className="font-semibold text-xl mb-4">{media.title}</h1>
        <MediaView media={media} />
      </div>
    </Layout>
  )
}

export default MediaSharePage
