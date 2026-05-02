import { useState, useEffect } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useNavigate } from 'react-router-dom'
import i18n from 'i18next'
import { LOCALE_DISPLAY_NAMES } from '../../helpers/localeDisplayNames'

const BASE = import.meta.env.BASE_URL

type Manifest = { locales: string[] }

async function fetchManifest(signal: AbortSignal): Promise<Manifest> {
    try {
        const res = await fetch(`${BASE}assets/lic-locales/manifest.json`, { signal })
        if (res.ok) return res.json() as Promise<Manifest>
    } catch (err) {
        // Re-throw aborts so the caller can detect cancellation; swallow other errors.
        if (err instanceof DOMException && err.name === 'AbortError') throw err
        /* fall through – network/parse error → use default */
    }
    return { locales: ['en'] }
}

async function fetchLicenseMd(lang: string, signal: AbortSignal): Promise<string> {
    const primaryRes = await fetch(
        `${BASE}assets/lic-locales/${lang}/${LICENSE_FILE}`,
        { signal },
    )
    if (primaryRes.ok) return primaryRes.text()

    // Fallback to English when the requested locale file is absent,
    // but skip the extra round-trip if English was already requested.
    if (lang !== 'en') {
        const fallbackRes = await fetch(
            `${BASE}assets/lic-locales/en/${LICENSE_FILE}`,
            { signal },
        )
        if (fallbackRes.ok) return fallbackRes.text()
    }

    throw new Error('License file unavailable')
}

const LICENSE_FILE = 'ETHICAL_USE_LICENSE.md'

/** Best-effort match of the app's current i18n language to an available locale. */
function resolveInitialLocale(availableLocales: string[]): string {
    const appLang = i18n.language ?? 'en'
    if (availableLocales.includes(appLang)) return appLang
    // Try base language (e.g. "zh" from "zh-TW")
    const base = appLang.split('-')[0]
    const match = availableLocales.find(l => l.startsWith(base))
    return match ?? 'en'
}

// CSS for the rendered Markdown — scoped to .eul-content, supports light/dark
const CONTENT_CSS = `
    .eul-content { line-height: 1.75; }
    .eul-content h1 {
        font-size: 1.6rem; font-weight: 700;
        border-bottom: 2px solid; padding-bottom: .4rem; margin: 1.5rem 0 1rem;
    }
    .eul-content h2 {
        font-size: 1.1rem; font-weight: 600; margin-top: 2rem; margin-bottom: .5rem;
    }
    .eul-content hr { border: none; border-top: 1px solid; margin: 1.25rem 0; opacity: .25; }
    .eul-content ul { padding-left: 1.5rem; margin: .5rem 0; }
    .eul-content li { margin-bottom: .35rem; }
    .eul-content strong { color: #b91c1c; }
    .eul-content a { text-decoration: underline; }
    .eul-content p:last-child { text-align: center; font-size: 1.4rem; }
    @media (prefers-color-scheme: dark) {
        .eul-content h2 { color: #6fa3ef; }
        .eul-content strong { color: #f87171; }
        .eul-content a { color: #60a5fa; }
    }
`

const EthicalUseLicensePage = () => {
    const navigate = useNavigate()
    const [availableLocales, setAvailableLocales] = useState<string[]>(['en'])
    const [selectedLang, setSelectedLang] = useState('en')
    const [html, setHtml] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load manifest on mount, then resolve initial locale
    useEffect(() => {
        const controller = new AbortController()
        fetchManifest(controller.signal)
            .then(m => {
                setAvailableLocales(m.locales)
                setSelectedLang(resolveInitialLocale(m.locales))
            })
            .catch(() => {
                // AbortError (unmount) or unexpected failure – keep defaults.
            })
        return () => controller.abort()
    }, [])

    // Fetch MD whenever selected language changes
    // A new AbortController is created on every run; the cleanup function aborts
    // the previous controller, so only the most-recent locale's fetch can update state.
    // This covers both the auto-resolved locale (after the manifest loads) and manual dropdown switches.
    useEffect(() => {
        const controller = new AbortController()
        setLoading(true)
        setError(null)
        fetchLicenseMd(selectedLang, controller.signal)
            .then(md => {
                setHtml(DOMPurify.sanitize(marked.parse(md) as string))
                setLoading(false)
            })
            .catch(err => {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setError('Failed to load the license document. Please try again.')
                setLoading(false)
            })
        return () => controller.abort()
    }, [selectedLang])

    return (
        <>
            {/* Scoped styles for the rendered Markdown */}
            <style>{CONTENT_CSS}</style>

            <div className="min-h-screen bg-white dark:bg-[`#1e2227`] text-gray-900 dark:text-gray-100">
                {/* Sticky toolbar */}
                <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3
                        border-b border-gray-200 dark:border-gray-700
                        bg-white/90 dark:bg-[`#1e2227`]/90 backdrop-blur">
                    <button
                        onClick={() => navigate(-1)}
                        className="shrink-0 text-sm text-blue-600 dark:text-blue-400
                        hover:underline focus:outline-none
                        focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    >
                        ← Back
                    </button>

                    <span className="flex-1 text-sm font-semibold truncate">
                        🇺🇦 Ethical Use License (EUL)
                    </span>

                    {/* Language switcher — hidden until >1 locale is available */}
                    {availableLocales.length > 1 && (
                        <select
                            value={selectedLang}
                            onChange={e => setSelectedLang(e.target.value)}
                            aria-label="Select language"
                            className="shrink-0 text-sm rounded border border-gray-300 dark:border-gray-600
                            bg-white dark:bg-[`#31363d`] px-2 py-1
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            {availableLocales.map(code => (
                                <option key={code} value={code}>
                                    {LOCALE_DISPLAY_NAMES[code] ?? code}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Document area */}
                <div className="max-w-3xl mx-auto px-6 py-8 pb-20">
                    {loading && (
                        <p className="text-gray-400 dark:text-gray-500 animate-pulse">Loading…</p>
                    )}
                    {error && (
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    )}
                    {!loading && !error && (
                        <div
                            className="eul-content"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    )}
                </div>
            </div>
        </>
    )
}

export default EthicalUseLicensePage
