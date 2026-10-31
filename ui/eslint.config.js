const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierConfig = require('eslint-config-prettier/flat');
const globals = require('globals');

module.exports = [
    // Global ignores
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            '**/__generated__/**',
            '**/*.test.*',
        ],
    },

    // Base ESLint recommended
    js.configs.recommended,

    // Typed rules for application code and known TypeScript tooling.
    {
        files: [
            'src/**/*.{ts,mts,tsx}',
            'codegen.ts',
            'i18next.config.ts',
            'vite-plugins/**/*.{ts,mts}',
        ],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: ['./tsconfig.json'],
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'warn',
            reportUnusedInlineConfigs: 'warn',
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            'react': reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        rules: {
            // TypeScript recommended rules
            ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
            ...tsPlugin.configs['recommended-type-checked'].rules,

            // React recommended rules
            ...reactPlugin.configs.recommended.rules,
            ...reactPlugin.configs['jsx-runtime'].rules,

            // React Hooks recommended rules from the installed plugin.
            ...reactHooksPlugin.configs.recommended.rules,

            // Custom overrides
            'no-unused-vars': 'off',
            'react/display-name': 'off',
            'react/prop-types': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-misused-promises': 'warn',
        },
        settings: {
            react: {
                version: 'detect',
                runtime: 'automatic',
            },
        },
    },

    // Browser application code. Do not give the service worker DOM globals.
    {
        files: ['src/**/*.{js,mjs,jsx,ts,mts,tsx}'],
        ignores: ['src/service-worker.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
            },
        },
    },

    // Service-worker code has no window or document.
    {
        files: ['src/service-worker.ts'],
        languageOptions: {
            globals: {
                ...globals.serviceworker,
            },
        },
    },

    // Node ESM tooling. CommonJS-only names are not available here.
    {
        files: [
            'vite.config.mjs',
            'codegen.ts',
            'i18next.config.ts',
            'vite-plugins/**/*.{ts,mts}',
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.nodeBuiltin,
            },
        },
    },

    // Existing CommonJS configuration and test transformer.
    {
        files: [
            'eslint.config.js',
            'testing/transform-svg.js',
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
    },

    // Prettier must be last to override other formatting rules
    prettierConfig,
];
