import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import i18n from 'i18next'
import EthicalUseLicensePage from './EthicalUseLicensePage'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom') as object
    return { ...actual, useNavigate: () => mockNavigate }
})

// Mock marked and DOMPurify so tests are deterministic and fast.
// DOMPurify.sanitize is an identity pass-through; marked.parse returns a
// fixed HTML string so assertions on rendered content are stable.
vi.mock('marked', () => ({
    marked: { parse: (_: string) => '<p>Mock license content</p>' },
}))
vi.mock('dompurify', () => ({
    default: { sanitize: (html: string) => html },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal fetch-response-like objects used by mock fetch. */
function okJson(body: object) {
    return { ok: true, json: () => Promise.resolve(body), text: () => Promise.resolve('') }
}
function okText(text: string) {
    return { ok: true, text: () => Promise.resolve(text), json: () => Promise.resolve({}) }
}
function notFound() {
    return { ok: false, text: () => Promise.resolve('Not found'), json: () => Promise.resolve({}) }
}

function renderPage() {
    return render(
        <MemoryRouter>
            <EthicalUseLicensePage />
        </MemoryRouter>
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EthicalUseLicensePage', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
        vi.stubGlobal('fetch', mockFetch)
        mockNavigate.mockClear()
        vi.spyOn(i18n, 'changeLanguage').mockResolvedValue((() => '') as never)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks() // resets i18n.language spies between tests
        vi.resetAllMocks()
    })

    // -----------------------------------------------------------------------
    describe('loading state', () => {
        test('shows a loading indicator while content is being fetched', () => {
            // Neither promise resolves during this test — keep the loading state visible.
            mockFetch.mockReturnValue(new Promise(() => { }))

            renderPage()

            expect(screen.getByText(/loading/i)).toBeInTheDocument()
        })

        test('hides the loading indicator once content has loaded', async () => {
            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en'] })) // manifest
                .mockResolvedValueOnce(okText('# License'))          // en MD

            renderPage()

            await waitFor(() =>
                expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
            )
        })
    })

    // -----------------------------------------------------------------------
    describe('content rendering', () => {
        test('renders the parsed markdown after a successful fetch', async () => {
            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en'] }))
                .mockResolvedValueOnce(okText('# License'))

            renderPage()

            await waitFor(() =>
                expect(screen.getByText('Mock license content')).toBeInTheDocument()
            )
        })

        test('does not show an error when content loads successfully', async () => {
            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en'] }))
                .mockResolvedValueOnce(okText('# License'))

            renderPage()

            await waitFor(() =>
                expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
            )
            expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        })
    })

    // -----------------------------------------------------------------------
    describe('error handling', () => {
        test('shows an accessible error message when the license file cannot be loaded', async () => {
            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en'] })) // manifest OK
                .mockResolvedValueOnce(notFound())                  // en MD → 404

            renderPage()

            const alert = await screen.findByRole('alert')
            expect(alert).toBeInTheDocument()
            expect(alert).toHaveTextContent(/failed to load/i)
        })

        test('shows an error when both the primary locale and the English fallback fail', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('fr')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'fr'] })) // manifest
                .mockResolvedValueOnce(okText(''))                         // en MD (initial, aborted)
                .mockResolvedValueOnce(notFound())                         // fr MD → 404
                .mockResolvedValueOnce(notFound())                         // en fallback → 404

            renderPage()

            await waitFor(() =>
                expect(screen.getByRole('alert')).toBeInTheDocument()
            )
        })

        test('clears the error and shows content after the user switches to a working locale', async () => {
            const user = userEvent.setup()
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('fr')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'fr'] })) // manifest
                .mockResolvedValueOnce(okText(''))                         // en MD (initial, aborted)
                .mockResolvedValueOnce(notFound())                         // fr MD → 404
                .mockResolvedValueOnce(notFound())                         // en fallback → 404
                .mockResolvedValueOnce(okText('# English License'))        // en MD after manual switch

            renderPage()

            await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

            const select = screen.getByRole('combobox')
            await user.selectOptions(select, 'en')

            await waitFor(() =>
                expect(screen.queryByRole('alert')).not.toBeInTheDocument()
            )
            expect(screen.getByText('Mock license content')).toBeInTheDocument()
        })
    })

    // -----------------------------------------------------------------------
    describe('language selector', () => {
        test('is NOT rendered when only one locale is available', async () => {
            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en'] }))
                .mockResolvedValueOnce(okText('# License'))

            renderPage()

            await waitFor(() =>
                expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
            )
            expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        })

        test('IS rendered when multiple locales are available', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('en')
            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'de', 'fr'] }))
                .mockResolvedValueOnce(okText('# License'))

            renderPage()

            await waitFor(() =>
                expect(screen.getByRole('combobox')).toBeInTheDocument()
            )
        })

        test('lists all available locales as options', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('en')
            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'de', 'fr'] }))
                .mockResolvedValueOnce(okText('# License'))

            renderPage()

            await waitFor(() =>
                expect(screen.getByRole('combobox')).toBeInTheDocument()
            )
            const options = screen.getAllByRole('option') as HTMLOptionElement[]
            expect(options).toHaveLength(3)
            expect(options.map(o => o.value)).toEqual(
                expect.arrayContaining(['en', 'de', 'fr'])
            )
        })

        test('switching the language fetches the new locale and re-renders content', async () => {
            const user = userEvent.setup()
            // i18n.language is 'en' → initial fetch is en, no locale change on manifest resolve
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('en')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'de'] })) // manifest
                .mockResolvedValueOnce(okText('# EN License'))             // en MD (initial)
                .mockResolvedValueOnce(okText('# DE License'))             // de MD (after switch)

            renderPage()
            await waitFor(() =>
                expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
            )

            await user.selectOptions(screen.getByRole('combobox'), 'de')

            await waitFor(() =>
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/de/ETHICAL_USE_LICENSE.md'),
                    expect.any(Object)
                )
            )
        })
    })

    // -----------------------------------------------------------------------
    describe('locale resolution', () => {
        test('uses an exact match of i18n.language against available locales', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('de')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'de', 'fr'] })) // manifest
                .mockResolvedValueOnce(okText(''))                               // en MD (initial, aborted)
                .mockResolvedValueOnce(okText('# DE License'))                   // de MD (resolved locale)

            renderPage()

            await waitFor(() =>
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/de/ETHICAL_USE_LICENSE.md'),
                    expect.any(Object)
                )
            )
        })

        test('matches via base language when exact locale is absent (e.g. zh-TW → zh-CN)', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('zh-TW')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'zh-CN'] })) // manifest
                .mockResolvedValueOnce(okText(''))                            // en MD (initial, aborted)
                .mockResolvedValueOnce(okText('# ZH-CN License'))             // zh-CN MD

            renderPage()

            await waitFor(() =>
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/zh-CN/ETHICAL_USE_LICENSE.md'),
                    expect.any(Object)
                )
            )
        })

        test('falls back to "en" when i18n.language has no match in available locales', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('ja')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'de'] })) // manifest — 'ja' not listed
                .mockResolvedValueOnce(okText('# License'))                // en MD (initial = resolved, same value)

            renderPage()

            await waitFor(() =>
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/en/ETHICAL_USE_LICENSE.md'),
                    expect.any(Object)
                )
            )
            // Locale selector should be visible (2 locales in manifest)
            await waitFor(() =>
                expect(screen.getByRole('combobox')).toBeInTheDocument()
            )
        })
    })

    // -----------------------------------------------------------------------
    describe('manifest fetch failure fallback', () => {
        test('falls back to ["en"] when the manifest request rejects (network error)', async () => {
            // manifest fetch rejects; fetchManifest catches it and returns { locales: ['en'] }
            mockFetch
                .mockRejectedValueOnce(new Error('Network failure')) // manifest
                .mockResolvedValueOnce(okText('# License'))          // en MD

            renderPage()

            await waitFor(() =>
                expect(screen.getByText('Mock license content')).toBeInTheDocument()
            )
            // Only one locale → no selector
            expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        })

        test('falls back to ["en"] when the manifest returns a non-OK status', async () => {
            mockFetch
                .mockResolvedValueOnce(notFound())          // manifest 404
                .mockResolvedValueOnce(okText('# License')) // en MD

            renderPage()

            await waitFor(() =>
                expect(screen.getByText('Mock license content')).toBeInTheDocument()
            )
        })
    })

    // -----------------------------------------------------------------------
    describe('MD fetch English fallback', () => {
        test('falls back to English MD when the primary locale fetch returns non-OK', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('fr')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en', 'fr'] })) // manifest
                .mockResolvedValueOnce(okText(''))                         // en MD (initial, aborted)
                .mockResolvedValueOnce(notFound())                         // fr MD → 404
                .mockResolvedValueOnce(okText('# English Fallback'))       // en fallback → OK

            renderPage()

            await waitFor(() =>
                expect(screen.getByText('Mock license content')).toBeInTheDocument()
            )
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/en/ETHICAL_USE_LICENSE.md'),
                expect.any(Object)
            )
        })

        test('does NOT make a redundant fallback fetch when "en" is already the selected locale', async () => {
            vi.spyOn(i18n, 'language', 'get').mockReturnValue('en')

            mockFetch
                .mockResolvedValueOnce(okJson({ locales: ['en'] })) // manifest
                .mockResolvedValueOnce(notFound())                   // en MD → 404, no extra fallback

            renderPage()

            await waitFor(() =>
                expect(screen.getByRole('alert')).toBeInTheDocument()
            )
            // Only 2 fetch calls: manifest + en MD; no third fallback round-trip
            expect(mockFetch).toHaveBeenCalledTimes(2)
        })
    })

    // -----------------------------------------------------------------------
    describe('page branding', () => {
        test('renders the Photoview logo', () => {
            mockFetch.mockReturnValue(new Promise(() => { }))

            renderPage()

            expect(screen.getByRole('img', { name: /photoview logo/i })).toBeInTheDocument()
        })

        test('renders the app name', () => {
            mockFetch.mockReturnValue(new Promise(() => { }))

            renderPage()

            expect(screen.getByText('Photoview')).toBeInTheDocument()
        })

        test('renders the Ethical Use License page title in the toolbar', () => {
            mockFetch.mockReturnValue(new Promise(() => { }))

            renderPage()

            expect(screen.getByText(/ethical use license/i)).toBeInTheDocument()
        })
    })
})
