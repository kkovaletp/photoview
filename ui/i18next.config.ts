import { defineConfig } from 'i18next-cli'

export default defineConfig({
    locales: [
        'da', 'de', 'en', 'es', 'fr', 'it',
        'ja', 'pl', 'pt', 'ru', 'sv', 'uk',
        'zh-CN', 'zh-HK', 'zh-TW',
    ],
    extract: {
        input: ['src/**/*.{js,ts,jsx,tsx}'],
        output: 'src/extractedTranslations/{{language}}/{{namespace}}.json',
        sort: true,
        primaryLanguage: 'en',
        defaultValue: '',
    },
})
