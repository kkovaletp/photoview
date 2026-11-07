import { StrictMode, useContext, type ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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

vi.mock('../../components/sidebar/MediaSidebar/MediaSidebar', () => ({
  default: ({ media }: { media: { title: string } }) => (
    <div data-testid="sidebar-media">{media.title}</div>
  ),
}))

type Media = NonNullable<SharePageTokenQuery['shareToken']['media']>

const makeMedia = (id: string, title: string): Media => ({
  __typename: 'Media',
  id,
  title,
  type: MediaType.Photo,
  thumbnail: null,
  downloads: [],
  highRes: null,
  videoWeb: null,
  exif: null,
})

const SidebarProbe = () => {
  const { content, pinned, setPinned } = useContext(SidebarContext)

  return (
    <div>
      <span data-testid="pinned">{String(pinned)}</span>
      <button type="button" onClick={() => setPinned(!pinned)}>
        Toggle pin
      </button>
      {content}
    </div>
  )
}

const page = (media: Media) => (
  <StrictMode>
    <MemoryRouter>
      <SidebarProvider>
        <MediaSharePage media={media} />
        <SidebarProbe />
      </SidebarProvider>
    </MemoryRouter>
  </StrictMode>
)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('media share sidebar pinning', () => {
  it('preserves the pin choice when media details refresh', () => {
    vi.stubGlobal('innerWidth', 1024)
    const first = makeMedia('1', 'Original title')
    const view = render(page(first))

    expect(screen.getByTestId('pinned')).toHaveTextContent('true')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle pin' }))
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')

    view.rerender(page({ ...first, title: 'Updated title' }))

    expect(screen.getByTestId('sidebar-media')).toHaveTextContent(
      'Updated title'
    )
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')

    fireEvent.click(screen.getByRole('button', { name: 'Toggle pin' }))
    view.rerender(page({ ...first, title: 'Updated again' }))

    expect(screen.getByTestId('pinned')).toHaveTextContent('true')
    expect(screen.getByTestId('sidebar-media')).toHaveTextContent(
      'Updated again'
    )
  })

  it('does not apply the desktop default after a narrow-screen opening', () => {
    vi.stubGlobal('innerWidth', 1023)
    const first = makeMedia('1', 'Original title')
    const view = render(page(first))

    expect(screen.getByTestId('pinned')).toHaveTextContent('false')

    vi.stubGlobal('innerWidth', 1024)
    view.rerender(page({ ...first, title: 'Updated title' }))

    expect(screen.getByTestId('sidebar-media')).toHaveTextContent(
      'Updated title'
    )
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')
  })

  it('applies the default when a different media item opens', () => {
    vi.stubGlobal('innerWidth', 1024)
    const view = render(page(makeMedia('1', 'First item')))

    fireEvent.click(screen.getByRole('button', { name: 'Toggle pin' }))
    expect(screen.getByTestId('pinned')).toHaveTextContent('false')

    view.rerender(page(makeMedia('2', 'Second item')))

    expect(screen.getByTestId('sidebar-media')).toHaveTextContent('Second item')
    expect(screen.getByTestId('pinned')).toHaveTextContent('true')
  })
})
