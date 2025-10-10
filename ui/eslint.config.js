const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
    // Global ignores
    {
        ignores: ['node_modules/**', 'dist/**'],
    },

    // Base ESLint recommended
    js.configs.recommended,

    // Configuration for all JS/TS files
    {
        files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: ['./tsconfig.json'],
                ecmaFeatures: {
                    jsx: true,
                },
                ecmaVersion: 2020,
                sourceType: 'module',
            },
            globals: {
                ...globals.browser,
                ...globals.es2020,
                Atomics: 'readonly',
                SharedArrayBuffer: 'readonly',
                process: 'readonly',
                module: 'readonly',
                require: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            'react': reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        rules: {
            // TypeScript recommended rules
            ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
            ...tsPlugin.configs.recommended.rules,
            ...tsPlugin.configs['recommended-requiring-type-checking'].rules,

            // React recommended rules
            ...reactPlugin.configs.recommended.rules,

            // React Hooks rules (from v6.x recommended)
            ...reactHooksPlugin.configs.recommended.rules,

            // Custom overrides
            'no-unused-vars': 'off',
            'react/display-name': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/jsx-uses-react': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
        },
        settings: {
            react: {
                version: 'detect',
                runtime: 'automatic',
            },
        },
    },

    // Prettier must be last to override other formatting rules
    prettierConfig,
];
