import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import i18n from 'i18next'
import { LOCALE_DISPLAY_NAMES } from '../../helpers/localeDisplayNames'
import { useTranslation } from 'react-i18next'

// Vite static glob — pattern must be a string literal at the call-site.
const translationModules = import.meta.glob<{ default: Record<string, unknown> }>(
    '../../extractedTranslations/*/translation.json'
)

const BASE = import.meta.env.BASE_URL
const LICENSE_FILE = 'ETHICAL_USE_LICENSE.md'

type Manifest = { locales: string[] }

// Load a locale bundle into i18n (no-op if already loaded) and return getFixedT for it.
async function loadBundle(locale: string): Promise<void> {
    if (!i18n.hasResourceBundle(locale, 'translation')) {
        const loader = translationModules[`../../extractedTranslations/${locale}/translation.json`]
        if (loader) {
            try {
                const mod = await loader()
                i18n.addResourceBundle(locale, 'translation', mod.default, true, true)
            } catch {
                // Bundle load failed — t() with { lng } will fall back to 'en'
            }
        }
    }
}

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

/** Best-effort match of the app's current i18n language to an available locale. */
function resolveInitialLocale(availableLocales: string[]): string {
    const appLang = i18n.language ?? 'en'
    if (availableLocales.includes(appLang)) return appLang
    // Try base language (e.g. "zh" from "zh-TW")
    const base = appLang.split('-')[0]
    const match = availableLocales.find(l => l.startsWith(base))
    return match ?? 'en'
}

// CSS for the rendered Markdown — scoped to .eul-content.
// Uses `.dark .eul-content` (class-based) instead of `@media` (prefers-color-scheme: dark)
// so it correctly respects the user's saved theme preference (via localStorage / updateTheme())
// and falls back to OS preference for unauthenticated visitors — consistent with the rest of the app.
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

    /* Restore list markers stripped by Tailwind v4 preflight */
    .eul-content ul { list-style-type: disc; }
    .eul-content ol { list-style-type: decimal; }
    .eul-content ul ul { list-style-type: circle; }
    .eul-content ul ul ul { list-style-type: square; }

    /* Scope the closing slogan rule to a DIRECT child of the container only */
    .eul-content > p:last-child { text-align: center; font-size: 1.4rem; }

    .dark .eul-content h2 { color: #6fa3ef; }
    .dark .eul-content strong { color: #f87171; }
    .dark .eul-content a { color: #60a5fa; }
`

const EthicalUseLicensePage = () => {
    const { t } = useTranslation()
    const [availableLocales, setAvailableLocales] = useState<string[]>(['en'])
    const [selectedLang, setSelectedLang] = useState('en')
    const [bundleReady, setBundleReady] = useState(false)

    /** Set to true once the user manually picks a locale from the dropdown. */
    const userHasPickedLocale = useRef(false)
    /**
     * Always-current mirror of `availableLocales`.
     * Lets the `languageChanged` handler resolve the right locale
     * without needing to re-subscribe every time locales are updated.
     */
    const availableLocalesRef = useRef<string[]>(['en'])

    const [result, setResult] = useState<{
        lang: string
        html: string
        hasError: boolean
    } | null>(null)
    const loading = result?.lang !== selectedLang
    const hasError = !loading && (result?.hasError ?? false)
    const html = loading ? '' : (result?.html ?? '')

    // Load translation bundle when the selected locale changes.
    useEffect(() => {
        setBundleReady(false)
        loadBundle(selectedLang).then(() => setBundleReady(true))
    }, [selectedLang])

    // Keep the browser tab title in sync with both the app language and the selected license locale.
    useEffect(() => {
        document.title = `${t('ethical_use_license_page.title',
            { defaultValue: '🇺🇦 Ethical Use License (EUL)', lng: selectedLang }
        )} - Photoview`
        return () => {
            document.title = 'Photoview'
        }
    }, [t, selectedLang, bundleReady])

    // Load manifest on mount, then resolve initial locale
    useEffect(() => {
        const controller = new AbortController()
        fetchManifest(controller.signal)
            .then(m => {
                if (controller.signal.aborted) return
                availableLocalesRef.current = m.locales
                setAvailableLocales(m.locales)
                // Only auto-resolve if the user hasn't already picked manually.
                if (!userHasPickedLocale.current) {
                    setSelectedLang(resolveInitialLocale(m.locales))
                }
            })
            .catch(() => {
                // AbortError (unmount) or unexpected failure – keep defaults.
            })
        return () => controller.abort()
    }, [])

    // Subscribe to i18n's languageChanged event so that if Apollo/loadTranslations
    // switches the language *after* the manifest has already resolved, selectedLang
    // is updated accordingly — unless the user has manually chosen a locale.
    // Empty deps: only accesses refs (always current), no re-subscription needed.
    useEffect(() => {
        const handleLanguageChanged = () => {
            if (!userHasPickedLocale.current) {
                setSelectedLang(resolveInitialLocale(availableLocalesRef.current))
            }
        }
        i18n.on('languageChanged', handleLanguageChanged)
        return () => {
            i18n.off('languageChanged', handleLanguageChanged)
        }
    }, [])

    // Fetch MD whenever selected language changes.
    // A new AbortController is created on every run; the cleanup function aborts
    // the previous controller, so only the most-recent locale's fetch can update state.
    // This covers both the auto-resolved locale (after the manifest loads) and manual dropdown switches.
    useEffect(() => {
        const controller = new AbortController()
        fetchLicenseMd(selectedLang, controller.signal)
            .then(md => {
                if (controller.signal.aborted) return
                setResult({
                    lang: selectedLang,
                    html: DOMPurify.sanitize(marked.parse(md, { async: false })),
                    hasError: false,
                })
            })
            .catch(err => {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setResult({
                    lang: selectedLang,
                    html: '',
                    hasError: true,
                })
            })
        return () => controller.abort()
    }, [selectedLang])

    return (
        <>
            {/* Scoped styles for the rendered Markdown */}
            <style>{CONTENT_CSS}</style>

            <div className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text">
                {/* Sticky toolbar */}
                <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3
                        border-b border-gray-200 dark:border-dark-border
                        bg-white/90 dark:bg-dark-bg/90 backdrop-blur">
                    <span className="flex-1 text-sm font-semibold truncate">
                        {t('ethical_use_license_page.title',
                            { defaultValue: '🇺🇦 Ethical Use License (EUL)', lng: selectedLang }
                        )}
                    </span>

                    {/* Language switcher — hidden until >1 locale is available */}
                    {availableLocales.length > 1 && (
                        <select
                            value={selectedLang}
                            onChange={e => {
                                userHasPickedLocale.current = true
                                setSelectedLang(e.target.value)
                            }}
                            aria-label={t('settings.user_preferences.language_selector.placeholder', 'Select language')}
                            className="shrink-0 text-sm rounded border border-gray-300 dark:border-dark-input-border
                            bg-white dark:bg-dark-input-bg px-2 py-1
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

                {/* Photoview branding — same logo source as Header.tsx and LoginPage.tsx */}
                <div className="flex flex-col items-center mt-8 mb-4">
                    <img
                        className="h-16 sm:h-20"
                        src={BASE + 'photoview-logo.svg'}
                        alt={t('header.logo_alt', 'Photoview logo')}
                    />
                    <h1 className="text-2xl sm:text-3xl font-light mt-3 text-center">
                        {t('meta.app_name', 'Photoview')}
                    </h1>
                </div>

                {/* Document area */}
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-20">
                    {loading && (
                        <p className="text-gray-400 dark:text-gray-500 animate-pulse">
                            {t('ethical_use_license_page.loading', { defaultValue: 'Loading…', lng: selectedLang })}
                        </p>
                    )}
                    {hasError && (
                        <p role="alert" className="text-red-600 dark:text-red-400">
                            {t('ethical_use_license_page.load_error', {
                                defaultValue: 'Failed to load the license document. Please try again.',
                                lng: selectedLang,
                            })}
                        </p>
                    )}
                    {!loading && !hasError && (
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
