import { defineConfig } from 'i18next-cli'

export default defineConfig({
    locales: [
        'da', 'de', 'en', 'es', 'eu', 'fr', 'it',
        'ja', 'pl', 'pt', 'ru', 'sv', 'tr', 'uk',
        'zh-CN', 'zh-HK', 'zh-TW',
    ],
    extract: {
        input: ['src/**/*.{js,ts,jsx,tsx}'],
        output: 'src/extractedTranslations/{{language}}/{{namespace}}.json',
        sort: true,
        primaryLanguage: 'en',
        defaultValue: '',
    },
    types: {
        input: ['src/extractedTranslations/en/*.json'],
        output: 'src/@types/i18next.d.ts',
        resourcesFile: 'src/@types/resources.d.ts',
    },
    lint: {
        ignore: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
})
