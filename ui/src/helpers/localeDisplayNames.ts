import { LanguageTranslation } from '../__generated__/globalTypes'

/**
 * Maps BCP 47 locale codes to their native (self-naming) display labels.
 * This is the single source of truth for locale display names across the app.
 */
export const LOCALE_DISPLAY_NAMES: Record<string, string> = {
    da: 'Dansk',
    de: 'Deutsch',
    en: 'English',
    es: 'Español',
    eu: 'Euskara',
    fr: 'Français',
    it: 'Italiano',
    ja: '日本語',
    nl: 'Nederlands',
    pl: 'Polski',
    pt: 'Português',
    ru: 'Русский',
    sv: 'Svenska',
    tr: 'Türkçe',
    uk: 'Українська',
    'zh-CN': '简体中文',
    'zh-HK': '繁體中文 (香港)',
    'zh-TW': '繁體中文 (台灣)',
}

/**
 * Maps GraphQL LanguageTranslation enum values to BCP 47 locale codes.
 * Use this to bridge the backend language setting to i18n locale codes.
 */
export const LANGUAGE_TRANSLATION_TO_LOCALE: Record<LanguageTranslation, string> = {
    [LanguageTranslation.English]: 'en',
    [LanguageTranslation.French]: 'fr',
    [LanguageTranslation.Swedish]: 'sv',
    [LanguageTranslation.Danish]: 'da',
    [LanguageTranslation.Spanish]: 'es',
    [LanguageTranslation.Polish]: 'pl',
    [LanguageTranslation.Italian]: 'it',
    [LanguageTranslation.German]: 'de',
    [LanguageTranslation.Russian]: 'ru',
    [LanguageTranslation.TraditionalChineseHk]: 'zh-HK',
    [LanguageTranslation.TraditionalChineseTw]: 'zh-TW',
    [LanguageTranslation.SimplifiedChinese]: 'zh-CN',
    [LanguageTranslation.Portuguese]: 'pt',
    [LanguageTranslation.Basque]: 'eu',
    [LanguageTranslation.Turkish]: 'tr',
    [LanguageTranslation.Ukrainian]: 'uk',
    [LanguageTranslation.Japanese]: 'ja',
    [LanguageTranslation.Dutch]: 'nl',
}

/**
 * Maps GraphQL LanguageTranslation enum values to Mapbox GL language codes.
 * These differ from BCP 47 in several cases:
 *   - Basque has no Mapbox support → falls back to 'en'
 *   - Both TraditionalChinese variants map to 'zh-Hant'
 *   - SimplifiedChinese maps to 'zh-Hans'
 */
export const LANGUAGE_TRANSLATION_TO_MAPBOX_LOCALE: Record<LanguageTranslation, string> = {
    [LanguageTranslation.Basque]: 'en',
    [LanguageTranslation.Danish]: 'da',
    [LanguageTranslation.Dutch]: 'nl',
    [LanguageTranslation.English]: 'en',
    [LanguageTranslation.French]: 'fr',
    [LanguageTranslation.German]: 'de',
    [LanguageTranslation.Italian]: 'it',
    [LanguageTranslation.Japanese]: 'ja',
    [LanguageTranslation.Polish]: 'pl',
    [LanguageTranslation.Portuguese]: 'pt',
    [LanguageTranslation.Russian]: 'ru',
    [LanguageTranslation.SimplifiedChinese]: 'zh-Hans',
    [LanguageTranslation.Spanish]: 'es',
    [LanguageTranslation.Swedish]: 'sv',
    [LanguageTranslation.TraditionalChineseHk]: 'zh-Hant',
    [LanguageTranslation.TraditionalChineseTw]: 'zh-Hant',
    [LanguageTranslation.Turkish]: 'tr',
    [LanguageTranslation.Ukrainian]: 'uk',
}
