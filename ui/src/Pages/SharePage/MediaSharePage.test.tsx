import { StrictMode, useContext, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaType } from '../../__generated__/globalTypes'
import {
  SidebarContext,
  SidebarProvider,
} from '../../components/sidebar/Sidebar'
import type { SharePageTokenQuery } from './__generated__/SharePage'
import MediaSharePage from './MediaSharePage'

vi.mock('../../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../../components/sidebar/MediaSidebar/MediaSidebar', async () => {
  const { default: SidebarHeader } = await import(
    '../../components/sidebar/SidebarHeader'
  )

  return {
    default: ({ media }: { media: { title: string } }) => (
      <div data-testid="sidebar-media">
        <SidebarHeader title={media.title} />
      </div>
    ),
  }
})

type Media = NonNullable<SharePageTokenQuery['shareToken']['media']>

const makeMedia = (
  id: string,
  title: string,
  type: MediaType = MediaType.Photo
): Media => ({
  __typename: 'Media',
  id,
  title,
  type,
  thumbnail: null,
  downloads: [],
  highRes: {
    __typename: 'MediaURL',
    url: 'https://example.com/photo.jpg',
    width: 4000,
    height: 1000,
  },
  videoWeb: {
    __typename: 'MediaURL',
    url: 'https://example.com/video.mp4',
    width: 4000,
    height: 1000,
  },
  exif: null,
})

const otherOwner = Symbol('other sidebar')

const SidebarProbe = () => {
  const { content, owner, pinned, setPinned, updateSidebar } =
    useContext(SidebarContext)

  return (
    <div>
      <span data-testid="pinned">{String(pinned)}</span>
      <span data-testid="sidebar-owner">
        {owner === otherOwner ? 'other' : 'not-other'}
      </span>
      <button type="button" onClick={() => setPinned(!pinned)}>
        Toggle pin
      </button>
      <button
        type="button"
        onClick={() => updateSidebar(<span>Other sidebar</span>, otherOwner)}
      >
        Open other sidebar
      </button>
      {content}
    </div>
  )
}

const page = (media: Media, showPage = true) => (
  <StrictMode>
    <MemoryRouter>
      <SidebarProvider>
        {showPage && <MediaSharePage media={media} />}
        <SidebarProbe />
      </SidebarProvider>
    </MemoryRouter>
  </StrictMode>
)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe.each([
  ['photo', MediaType.Photo],
  ['video', MediaType.Video],
])('media share sidebar: %s', (_label, type) => {
  it('disables the button while open and preserves the pin choice on refresh', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('innerWidth', 1024)
    const first = makeMedia('1', 'Original title', type)
    const view = render(page(first))

    const infoButton = screen.getByRole('button', { name: 'Show media info' })

    expect(infoButton).toBeDisabled()
    expect(infoButton).toHaveClass(
      'disabled:text-gray-500',
      'dark:disabled:text-gray-400'
    )
    expect(infoButton.querySelector('svg')).toHaveClass(
      '[&_g]:stroke-current'
    )
    expect(screen.getByTestId('pinned')).toHaveTextContent('true')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle pin' }))
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')

    await user.click(infoButton)
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')

    view.rerender(page({ ...first, title: 'Updated title' }))

    expect(screen.getByTestId('sidebar-media')).toHaveTextContent(
      'Updated title'
    )
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')
    expect(infoButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }))
    expect(infoButton).toBeEnabled()

    await user.click(infoButton)
    expect(infoButton).toBeDisabled()
    expect(screen.getByTestId('pinned')).toHaveTextContent('true')
    expect(screen.getByTestId('sidebar-media')).toHaveTextContent(
      'Updated title'
    )
  })

  it('keeps a closed sidebar closed on refresh and resize', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('innerWidth', 1023)
    const first = makeMedia('1', 'Original title', type)
    const view = render(page(first))

    expect(screen.getByTestId('pinned')).toHaveTextContent('false')
    fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }))

    const infoButton = screen.getByRole('button', { name: 'Show media info' })
    expect(infoButton).toBeEnabled()

    vi.stubGlobal('innerWidth', 1024)
    fireEvent(window, new Event('resize'))
    view.rerender(page({ ...first, title: 'Updated while closed' }))

    expect(screen.queryByTestId('sidebar-media')).not.toBeInTheDocument()
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')
    expect(infoButton).toBeEnabled()

    await user.click(infoButton)
    expect(infoButton).toBeDisabled()
    expect(screen.getByTestId('pinned')).toHaveTextContent('true')
    expect(screen.getByTestId('sidebar-media')).toHaveTextContent(
      'Updated while closed'
    )
  })

  it('reopens without pinning on a narrow screen', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('innerWidth', 1023)
    render(page(makeMedia('1', 'Shared item', type)))

    fireEvent.click(screen.getByRole('button', { name: 'Close sidebar' }))
    await user.click(screen.getByRole('button', { name: 'Show media info' }))

    expect(screen.getByRole('button', { name: 'Show media info' })).toBeDisabled()
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')
  })

  it('applies the default for a different media item', () => {
    vi.stubGlobal('innerWidth', 1024)
    const view = render(page(makeMedia('1', 'First item', type)))

    fireEvent.click(screen.getByRole('button', { name: 'Toggle pin' }))
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')

    view.rerender(page(makeMedia('2', 'Second item', type)))

    expect(screen.getByTestId('sidebar-media')).toHaveTextContent('Second item')
    expect(screen.getByTestId('pinned')).toHaveTextContent('true')
  })
})

describe('media share sidebar cleanup', () => {
  it('clears its sidebar when the page unmounts', () => {
    vi.stubGlobal('innerWidth', 1024)
    const media = makeMedia('1', 'Shared item')
    const view = render(page(media))

    view.rerender(page(media, false))

    expect(screen.queryByTestId('sidebar-media')).not.toBeInTheDocument()
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')
  })

  it('does not replace or clear another component’s sidebar', () => {
    vi.stubGlobal('innerWidth', 1024)
    const media = makeMedia('1', 'Shared item')
    const view = render(page(media))

    fireEvent.click(screen.getByRole('button', { name: 'Open other sidebar' }))
    view.rerender(page({ ...media, title: 'Updated title' }))

    expect(screen.getByText('Other sidebar')).toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-media')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show media info' })).toBeDisabled()

    view.rerender(page(media, false))

    expect(screen.getByTestId('sidebar-owner')).toHaveTextContent('other')
    expect(screen.getByText('Other sidebar')).toBeInTheDocument()
  })
})
