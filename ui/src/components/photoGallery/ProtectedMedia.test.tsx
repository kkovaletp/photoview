import * as React from 'react'
import * as ReactRouter from 'react-router'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ProtectedImage, ProtectedVideo } from './ProtectedMedia'

vi.mock('react-blurhash', () => ({
  BlurhashCanvas: ({
    hash,
    className,
  }: {
    hash: string
    className?: string
  }) => (
    <div
      data-testid="blurhash-preview"
      data-hash={hash}
      className={className}
    />
  ),
}))

describe('shared media URLs', () => {
  it.each([
    {
      basename: '/',
      entry: '/share/abc123',
      token: 'abc123',
    },
    {
      basename: '/photoview',
      entry: '/photoview/share/abc123',
      token: 'abc123',
    },
    {
      basename: '/photoview/',
      entry: '/photoview/share/abc123/subalbum-1?sort=date',
      token: 'abc123',
    },
    {
      basename: '/photos/library/',
      entry: '/photos/library/share/abc-123',
      token: 'abc-123',
    },
    {
      basename: '/photoview',
      entry: '/photoview/album/album-1',
      token: undefined,
    },
  ])(
    'uses the share token at $entry',
    ({ basename, entry, token }) => {
      const { container } = render(
        <MemoryRouter basename={basename} initialEntries={[entry]}>
          <ProtectedImage
            src="/photo.jpg?size=large"
            alt="Shared photo"
          />
          <ProtectedVideo
            media={{
              id: 'video-1',
              thumbnail: { url: '/poster.jpg?size=large' },
              videoWeb: { url: '/video.mp4?quality=web' },
            }}
          />
        </MemoryRouter>
      )

      const suffix = token === undefined ? '' : `&token=${token}`

      expect(screen.getByRole('img', { name: 'Shared photo' }))
        .toHaveAttribute(
          'src',
          `${location.origin}/photo.jpg?size=large${suffix}`
        )

      expect(container.querySelector('video')).toHaveAttribute(
        'poster',
        `${location.origin}/poster.jpg?size=large${suffix}`
      )

      expect(container.querySelector('source')).toHaveAttribute(
        'src',
        `${location.origin}/video.mp4?quality=web${suffix}`
      )
    }
  )
})

type ProtectedMediaModule = typeof import('./ProtectedMedia')

async function loadProtectedMedia(
  nativeLazyLoading: boolean
): Promise<ProtectedMediaModule> {
  vi.resetModules()

  // Keep the same React and router instances used by the test renderer.
  vi.doMock('react', () => React)
  vi.doMock('react-router', () => ReactRouter)

  const probe = document.createElement('img')

  // Only the module's feature-detection probe uses this object.
  const featureProbe = new Proxy(probe, {
    has(target, property) {
      if (property === 'loading') return nativeLazyLoading
      return Reflect.has(target, property)
    },
  })

  const createElement = vi
    .spyOn(document, 'createElement')
    .mockReturnValueOnce(featureProbe)

  try {
    return await import('./ProtectedMedia')
  } finally {
    createElement.mockRestore()
  }
}

function installIntersectionObserver() {
  let callback: IntersectionObserverCallback | undefined
  let instance: IntersectionObserver | undefined

  const observe = vi.fn()
  const disconnect = vi.fn()

  const constructor = vi.fn(function (
    nextCallback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    callback = nextCallback

    instance = {
      root: options?.root ?? null,
      rootMargin: options?.rootMargin ?? '0px',
      scrollMargin: options?.scrollMargin ?? '0px',
      thresholds: [0],
      observe,
      unobserve: vi.fn(),
      disconnect,
      takeRecords: vi.fn(() => []),
    }

    return instance
  })

  vi.stubGlobal('IntersectionObserver', constructor)

  return {
    constructor,
    observe,
    disconnect,
    intersect(isIntersecting: boolean) {
      const target = observe.mock.calls[0]?.[0]

      if (!callback || !instance || !target) {
        throw new Error('Expected an initialized IntersectionObserver')
      }

      act(() => {
        callback!(
          [{ target, isIntersecting } as IntersectionObserverEntry],
          instance!
        )
      })
    },
  }
}

describe('ProtectedMedia loading and missing-data behavior', () => {
  const placeholder =
    'data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
  const blurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Unmount while the test's browser mocks are still installed.
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.doUnmock('react')
    vi.doUnmock('react-router')
    vi.resetModules()
  })

  it('uses the placeholder and empty alternative text without an image URL', () => {
    render(
      <MemoryRouter>
        <ProtectedImage />
      </MemoryRouter>
    )

    // An empty-alt image has a presentation role, not an img role.
    const image = screen.getByRole('presentation')

    expect(image).toHaveAttribute('src', placeholder)
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('crossorigin', 'use-credentials')
  })

  it('preserves attributes and the load handler for an eager image', () => {
    const onLoad = vi.fn()

    render(
      <MemoryRouter>
        <ProtectedImage
          src="/photo.jpg"
          alt="Original photo"
          className="photo-frame"
          width={640}
          height={480}
          onLoad={onLoad}
        />
      </MemoryRouter>
    )

    const image = screen.getByRole('img', { name: 'Original photo' })

    expect(image).toHaveAttribute(
      'src',
      `${location.origin}/photo.jpg`
    )
    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('crossorigin', 'use-credentials')
    expect(image).toHaveClass('photo-frame')
    expect(image).toHaveAttribute('width', '640')
    expect(image).toHaveAttribute('height', '480')

    fireEvent.load(image)

    expect(onLoad).toHaveBeenCalledOnce()
  })

  it('uses native lazy loading and removes the preview after loading', async () => {
    const observer = installIntersectionObserver()
    const { ProtectedImage: Image } = await loadProtectedMedia(true)

    render(
      <MemoryRouter>
        <Image
          src="/photo.jpg"
          alt="Lazy photo"
          lazyLoading
          blurhash={blurhash}
        />
      </MemoryRouter>
    )

    const image = screen.getByRole('img', { name: 'Lazy photo' })

    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('crossorigin', 'use-credentials')
    expect(screen.getByTestId('blurhash-preview')).toHaveAttribute(
      'data-hash',
      blurhash
    )
    expect(observer.constructor).not.toHaveBeenCalled()

    fireEvent.load(image)

    expect(
      screen.queryByTestId('blurhash-preview')
    ).not.toBeInTheDocument()
  })

  it('renders a native lazy image without a blurred preview', async () => {
    const { ProtectedImage: Image } = await loadProtectedMedia(true)

    render(
      <MemoryRouter>
        <Image src="/photo.jpg" alt="Lazy photo" lazyLoading />
      </MemoryRouter>
    )

    expect(screen.getByRole('img', { name: 'Lazy photo' }))
      .toHaveAttribute('loading', 'lazy')
    expect(
      screen.queryByTestId('blurhash-preview')
    ).not.toBeInTheDocument()
  })

  it('waits for intersection and retains the preview until the image loads', async () => {
    const observer = installIntersectionObserver()
    const { ProtectedImage: Image } = await loadProtectedMedia(false)

    render(
      <MemoryRouter
        basename="/photoview/"
        initialEntries={['/photoview/share/abc123/subalbum-1']}
      >
        <Image
          src="/photo.jpg?size=large"
          alt="Shared lazy photo"
          className="photo-frame"
          lazyLoading
          blurhash={blurhash}
        />
      </MemoryRouter>
    )

    expect(
      screen.queryByRole('img', { name: 'Shared lazy photo' })
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('blurhash-preview')).toHaveAttribute(
      'data-hash',
      blurhash
    )

    expect(observer.constructor).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      { root: null, threshold: 0 }
    )
    expect(observer.observe).toHaveBeenCalledOnce()

    const observedElement = observer.observe.mock.calls[0][0]

    expect(observedElement).toBeInstanceOf(HTMLDivElement)
    expect(observedElement).toHaveClass('photo-frame', 'bg-dark-text')

    observer.intersect(false)

    expect(
      screen.queryByRole('img', { name: 'Shared lazy photo' })
    ).not.toBeInTheDocument()
    expect(observer.disconnect).not.toHaveBeenCalled()

    observer.intersect(true)

    const image = screen.getByRole('img', {
      name: 'Shared lazy photo',
    })

    expect(image).toHaveAttribute(
      'src',
      `${location.origin}/photo.jpg?size=large&token=abc123`
    )
    expect(image).toHaveAttribute('crossorigin', 'use-credentials')
    expect(image.parentElement).toHaveClass('photo-frame')
    expect(image.parentElement).not.toHaveClass('bg-dark-text')
    expect(screen.getByTestId('blurhash-preview')).toBeInTheDocument()
    expect(observer.disconnect).toHaveBeenCalled()
    expect(observer.constructor).toHaveBeenCalledOnce()

    fireEvent.load(image)

    expect(
      screen.queryByTestId('blurhash-preview')
    ).not.toBeInTheDocument()
  })

  it('disconnects the observer when an offscreen image unmounts', async () => {
    const observer = installIntersectionObserver()
    const { ProtectedImage: Image } = await loadProtectedMedia(false)

    const { unmount } = render(
      <MemoryRouter>
        <Image src="/photo.jpg" alt="Offscreen photo" lazyLoading />
      </MemoryRouter>
    )

    expect(observer.observe).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('img', { name: 'Offscreen photo' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('blurhash-preview')
    ).not.toBeInTheDocument()
    expect(observer.disconnect).not.toHaveBeenCalled()

    unmount()

    expect(observer.disconnect).toHaveBeenCalledOnce()
  })

  it('renders the image when native lazy loading and the observer are unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { ProtectedImage: Image } = await loadProtectedMedia(false)

    render(
      <MemoryRouter>
        <Image
          src="/photo.jpg"
          alt="Fallback photo"
          lazyLoading
          blurhash={blurhash}
        />
      </MemoryRouter>
    )

    const image = screen.getByRole('img', { name: 'Fallback photo' })

    expect(image).toHaveAttribute(
      'src',
      `${location.origin}/photo.jpg`
    )
    expect(image).toHaveAttribute('crossorigin', 'use-credentials')
    expect(screen.getByTestId('blurhash-preview')).toBeInTheDocument()

    fireEvent.load(image)

    expect(
      screen.queryByTestId('blurhash-preview')
    ).not.toBeInTheDocument()
  })

  it.each([null, undefined])(
    'renders nothing and logs an error when videoWeb is %s',
    videoWeb => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)

      const { container } = render(
        <MemoryRouter>
          <ProtectedVideo media={{ id: 'video-1', videoWeb }} />
        </MemoryRouter>
      )

      expect(container).toBeEmptyDOMElement()
      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        'ProetctedVideo called with media.videoWeb = null'
      )
    }
  )

  it.each([null, undefined])(
    'renders a video without a poster when thumbnail is %s',
    thumbnail => {
      const { container } = render(
        <MemoryRouter>
          <ProtectedVideo
            media={{
              id: 'video-1',
              thumbnail,
              videoWeb: { url: '/video.mp4' },
            }}
          />
        </MemoryRouter>
      )

      const video = container.querySelector('video')

      expect(video).toBeInTheDocument()
      expect(video).not.toHaveAttribute('poster')
      expect(video).toHaveAttribute('controls')
      expect(video).toHaveAttribute('crossorigin', 'use-credentials')
      expect(video?.querySelector('source')).toHaveAttribute(
        'src',
        `${location.origin}/video.mp4`
      )
      expect(video?.querySelector('source')).toHaveAttribute(
        'type',
        'video/mp4'
      )
      expect(video?.querySelector('track')).toHaveAttribute(
        'kind',
        'captions'
      )
    }
  )

  it('replaces an existing token and preserves other URL parameters and the fragment', () => {
    render(
      <MemoryRouter
        basename="/photoview"
        initialEntries={['/photoview/share/abc123']}
      >
        <ProtectedImage
          src={`${location.origin}/photo.jpg?size=large&token=old#preview`}
          alt="Shared photo"
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('img', { name: 'Shared photo' }))
      .toHaveAttribute(
        'src',
        `${location.origin}/photo.jpg?size=large&token=abc123#preview`
      )
  })
})
