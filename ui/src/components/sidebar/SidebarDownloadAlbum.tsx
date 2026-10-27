import { useTranslation } from 'react-i18next'
import { useMatch } from 'react-router'
import { API_ENDPOINT } from '../../apolloClient'
import { SidebarSection, SidebarSectionTitle } from './SidebarComponents'
import SidebarTable from './SidebarTable'

type SidebarAlbumDownladProps = {
  albumID: string
}

const SidebarAlbumDownload = ({ albumID }: SidebarAlbumDownladProps) => {
  const { t } = useTranslation()
  const shareToken = useMatch('/share/:token/*')?.params.token

  const downloads = [
    {
      title: t('sidebar.album.download.thumbnails.title', 'Thumbnails'),
      description: t(
        'sidebar.album.download.thumbnails.description',
        'Low resolution images, no videos'
      ),
      purpose: 'thumbnail,video-thumbnail',
    },
    {
      title: t(
        'sidebar.album.download.high-resolutions.title',
        'High resolutions'
      ),
      description: t(
        'sidebar.album.download.high-resolutions.description',
        'High resolution jpegs of RAW images'
      ),
      purpose: 'high-res',
    },
    {
      title: t('sidebar.album.download.originals.title', 'Originals'),
      description: t(
        'sidebar.album.download.originals.description',
        'The original images and videos'
      ),
      purpose: 'original',
    },
    {
      title: t('sidebar.album.download.web-videos.title', 'Converted videos'),
      description: t(
        'sidebar.album.download.web-videos.description',
        'Videos that have been optimized for web'
      ),
      purpose: 'video-web',
    },
  ]

  const downloadRows = downloads.map(x => {
    const url = new URL(API_ENDPOINT, location.origin)

    url.pathname =
      `${url.pathname.replace(/\/+$/, '')}` +
      `/download/album/${encodeURIComponent(albumID)}/${x.purpose}`
    url.hash = ''

    if (shareToken !== undefined) {
      url.searchParams.set('token', shareToken)
    }

    return (
      <SidebarTable.Row key={x.purpose}>
        <td colSpan={2}>
          <a
            href={url.href}
            className="flex items-center gap-4 px-4 py-2"
          >
            <span className="shrink-0">{x.title}</span>
            <span className="ml-auto text-sm text-gray-800 dark:text-gray-400 italic">
              {x.description}
            </span>
          </a>
        </td>
      </SidebarTable.Row>
    )
  })

  return (
    <SidebarSection>
      <SidebarSectionTitle>
        {t('sidebar.download.title', 'Download')}
      </SidebarSectionTitle>

      <SidebarTable.Table>
        <SidebarTable.Head>
          <SidebarTable.HeadRow>
            <th className="px-4 py-2" colSpan={2}>
              {t('sidebar.download.table_columns.name', 'Name')}
            </th>
          </SidebarTable.HeadRow>
        </SidebarTable.Head>
        <tbody>{downloadRows}</tbody>
      </SidebarTable.Table>
    </SidebarSection>
  )
}

export default SidebarAlbumDownload
