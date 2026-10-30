import { act, cleanup, render, screen } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import VersionInfo from './VersionInfo'

vi.mock('./SettingsPage', () => ({
  SectionTitle: 'h2',
  InputLabelTitle: 'h3',
  InputLabelDescription: 'p',
}))

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

async function renderSettled() {
  let view!: ReturnType<typeof render>

  await act(async () => {
    view = render(<VersionInfo />)
  })

  return view
}

function expectVersionWithoutCommit() {
  expect(
    screen.getByRole('heading', { name: 'Photoview Version' })
  ).toBeInTheDocument()
  expect(screen.getByText('test-version')).toBeInTheDocument()
  expect(screen.getByText('test-date')).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('BASE_URL', '/')
  vi.stubEnv('REACT_APP_BUILD_VERSION', 'test-version')
  vi.stubEnv('REACT_APP_BUILD_DATE', 'test-date')
  vi.stubEnv('REACT_APP_BUILD_COMMIT_SHA', '')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('VersionInfo', () => {
  test('uses a build-time commit without requesting metadata', async () => {
    const sha = '0123456789abcdef'
    vi.stubEnv('REACT_APP_BUILD_COMMIT_SHA', sha)

    await renderSettled()

    const link = screen.getByRole('link', { name: '01234567' })
    expect(link).toHaveAttribute(
      'href',
      `https://github.com/kkovaletp/photoview/commit/${sha}`
    )
    expect(link).toHaveAttribute('title', sha)
    expect(screen.getByText('test-date')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test.each([
    { base: '/', sha: '0123456789abcdef' },
    { base: '/photoview/', sha: 'ABCDEF1234567890' },
  ])(
    'loads valid metadata from $base without caching',
    async ({ base, sha }) => {
      vi.stubEnv('BASE_URL', base)
      fetchMock.mockResolvedValue(jsonResponse({ commitSha: sha }))

      await renderSettled()

      const link = screen.getByRole('link', {
        name: sha.substring(0, 8),
      })

      expect(link).toHaveAttribute(
        'href',
        `https://github.com/kkovaletp/photoview/commit/${sha}`
      )
      expect(link).toHaveAttribute('title', sha)
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(fetchMock).toHaveBeenCalledWith(
        `${base}build-info.json`,
        {
          cache: 'no-store',
          signal: expect.any(AbortSignal),
        }
      )
    }
  )

  test('shows version information while metadata is pending', async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValue(pending.promise)

    render(<VersionInfo />)

    expectVersionWithoutCommit()

    await act(async () => {
      pending.resolve(jsonResponse({ commitSha: 'abcdef1234567890' }))
    })

    expect(
      screen.getByRole('link', { name: 'abcdef12' })
    ).toBeInTheDocument()
  })

  test('keeps version information after an unsuccessful HTTP response', async () => {
    const response = new Response('Unavailable', { status: 503 })
    const parse = vi.spyOn(response, 'json')
    fetchMock.mockResolvedValue(response)

    await renderSettled()

    expectVersionWithoutCommit()
    expect(parse).not.toHaveBeenCalled()
  })

  test.each([
    { name: 'null metadata', value: null },
    { name: 'a string', value: 'invalid' },
    { name: 'a number', value: 12 },
    { name: 'an array', value: [] },
    { name: 'a missing commit', value: {} },
    { name: 'a null commit', value: { commitSha: null } },
    { name: 'a numeric commit', value: { commitSha: 12 } },
    { name: 'an empty commit', value: { commitSha: '' } },
    { name: 'a non-hexadecimal commit', value: { commitSha: 'bad/hash' } },
  ])('ignores $name', async ({ value }) => {
    fetchMock.mockResolvedValue(jsonResponse(value))

    await renderSettled()

    expectVersionWithoutCommit()
  })

  test('keeps version information when the network request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network unavailable'))

    await renderSettled()

    expectVersionWithoutCommit()
  })

  test('keeps version information when metadata is not valid JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('not JSON', { status: 200 })
    )

    await renderSettled()

    expectVersionWithoutCommit()
  })

  test('aborts a pending request when the component unmounts', async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValue(pending.promise)

    const view = render(<VersionInfo />)
    const signal = fetchMock.mock.calls[0][1]?.signal

    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)

    view.unmount()

    expect(signal?.aborted).toBe(true)

    await act(async () => {
      pending.reject(new DOMException('Aborted', 'AbortError'))
    })
  })

  test('ignores a late response from a previous mount', async () => {
    const first = deferred<Response>()
    fetchMock
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(
        jsonResponse({ commitSha: 'bbbbbbbb12345678' })
      )

    const previous = render(<VersionInfo />)
    const previousSignal = fetchMock.mock.calls[0][1]?.signal
    previous.unmount()

    await renderSettled()

    await act(async () => {
      first.resolve(
        jsonResponse({ commitSha: 'aaaaaaaa12345678' })
      )
    })

    expect(previousSignal?.aborted).toBe(true)
    expect(
      screen.getByRole('link', { name: 'bbbbbbbb' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'aaaaaaaa' })
    ).not.toBeInTheDocument()
  })

  test('shows fallback values when build version and date are absent', async () => {
    vi.stubEnv('REACT_APP_BUILD_VERSION', undefined)
    vi.stubEnv('REACT_APP_BUILD_DATE', undefined)
    fetchMock.mockResolvedValue(jsonResponse({ commitSha: null }))

    await renderSettled()

    expect(screen.getAllByText('undefined')).toHaveLength(2)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
