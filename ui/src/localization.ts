import { useEffect } from 'react'
import {
  SiteTranslationQuery,
  SiteTranslationQueryVariables,
} from './__generated__/localization'
import { gql, type TypedDocumentNode } from '@apollo/client'
import { useLazyQuery } from '@apollo/client/react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { TFunction } from 'i18next'
import { LanguageTranslation } from './__generated__/globalTypes'
import { authToken } from './helpers/authentication'
import { isNil } from './helpers/utils'
import type * as mapboxgl from 'mapbox-gl/esm'
import {
  LANGUAGE_TRANSLATION_TO_LOCALE,
  LANGUAGE_TRANSLATION_TO_MAPBOX_LOCALE,
} from './helpers/localeDisplayNames'

export type TranslationFn = TFunction<'translation'>

/**
 * Pre-built map of all translation JSON loaders, keyed by the import path.
 * Vite analyses this glob at build time and creates lazy chunks for each locale.
 */
const translationModules = import.meta.glob<{ default: Record<string, unknown> }>(
  './extractedTranslations/*/translation.json'
)

export function setupLocalization(): void {
  i18n
    .use(initReactI18next)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      returnNull: false,
      returnEmptyString: false,

      interpolation: {
        escapeValue: false,
      },

      react: {
        useSuspense: import.meta.env.PROD,
      },
    })
    .catch(err => console.error('Failed to setup localization', err))
}

const SITE_TRANSLATION: TypedDocumentNode<
  SiteTranslationQuery,
  SiteTranslationQueryVariables
> = gql`
  query siteTranslation {
    myUserPreferences {
      id
      language
    }
  }
`
let map_language: LanguageTranslation | null
export const useLoadTranslations = (enabled = true) => {
  const [loadLang, { data }] = useLazyQuery(SITE_TRANSLATION)
  const token = enabled ? authToken() : undefined

  useEffect(() => {
    // Recheck the cookie because another effect can remove it after render.
    if (!token || !authToken()) {
      map_language = null
      void i18n.changeLanguage('en').catch((error: unknown) => {
        console.error('Failed to switch application language to English', error)
      })
      return
    }
    loadLang().catch(err => console.error('Failed to load user language', err))
  }, [token, loadLang])

  useEffect(() => {
    if (!token || !authToken()) return

    const language = data?.myUserPreferences.language
    if (isNil(language)) {
      map_language = null
      void i18n.changeLanguage('en').catch((error: unknown) => {
        console.error('Failed to switch application language to English', error)
      })
      return
    }

    let cancelled = false
    map_language = language

    const locale = LANGUAGE_TRANSLATION_TO_LOCALE[language] ?? 'en'
    const loader =
      translationModules[`./extractedTranslations/${locale}/translation.json`] ??
      translationModules['./extractedTranslations/en/translation.json']

    loader()
      .then(mod => {
        // Do not apply a bundle from a previous route or authenticated user.
        if (cancelled || authToken() !== token) return

        i18n.addResourceBundle(locale, 'translation', mod.default)
        return i18n.changeLanguage(locale)
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to load translation bundle', locale, err)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, data?.myUserPreferences.language])
}

export const SetMapLanguages = (map: mapboxgl.Map) => {
  const mapboxLocale = isNil(map_language)
    ? 'en'
    : (LANGUAGE_TRANSLATION_TO_MAPBOX_LOCALE[map_language] ?? 'en')
  map.setLanguage(mapboxLocale)
}
