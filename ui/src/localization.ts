import { useEffect } from 'react'
import { siteTranslation } from './__generated__/siteTranslation'
import { gql, useLazyQuery } from '@apollo/client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { TFunction } from 'i18next'
import { LanguageTranslation } from './__generated__/globalTypes'
import { authToken } from './helpers/authentication'
import { isNil } from './helpers/utils'
import type mapboxgl from 'mapbox-gl'
import MapboxLanguage from '@mapbox/mapbox-gl-language'
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

const SITE_TRANSLATION = gql`
  query siteTranslation {
    myUserPreferences {
      id
      language
    }
  }
`
let map_language: LanguageTranslation | null

export const loadTranslations = () => {
  const [loadLang, { data }] = useLazyQuery<siteTranslation>(SITE_TRANSLATION)

  useEffect(() => {
    if (authToken()) {
      loadLang()
    }
  }, [authToken()])

  useEffect(() => {
    const language = data?.myUserPreferences.language
    if (isNil(language)) {
      map_language = null
      i18n.changeLanguage('en')
      return
    }

    map_language = language

    const locale = LANGUAGE_TRANSLATION_TO_LOCALE[language] ?? 'en'
    const loader = translationModules[`./extractedTranslations/${locale}/translation.json`]
      ; (loader ?? translationModules['./extractedTranslations/en/translation.json'])()
        .then(mod => {
          i18n.addResourceBundle(locale, 'translation', mod.default)
          i18n.changeLanguage(locale)
        })
        .catch(err => console.error('Failed to load translation bundle', locale, err))
  }, [data?.myUserPreferences.language])
}

export const SetMapLanguages = (map: mapboxgl.Map) => {
  const mapboxLocale = isNil(map_language)
    ? 'en'
    : (LANGUAGE_TRANSLATION_TO_MAPBOX_LOCALE[map_language] ?? 'en')
  map.addControl(new MapboxLanguage({ defaultLanguage: mapboxLocale }))
}
