import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    // Reads all resolver schema files directly — no intermediate cache file needed
    schema: '../api/graphql/resolvers/*.graphql',

    // Scans all TS/TSX source files for inline gql`` tagged operations
    // Excludes previously generated files to avoid circular processing
    documents: [
        'src/**/*.tsx',
        'src/**/*.ts',
        '!src/**/__generated__/**',
    ],

    generates: {
        // ── Shared enums & input types (replaces src/__generated__/globalTypes.ts) ──
        'src/__generated__/globalTypes.ts': {
            plugins: ['typescript'],
            config: {
                enumsAsTypes: false,
                // Keeps scalar types consistent with the existing project conventions
                scalars: {
                    Time: 'string',
                    Upload: 'File',
                },
            },
        },

        // ── Per-component operation types (replaces all __generated__/*.ts files) ──
        'src/': {
            preset: 'near-operation-file',
            presetConfig: {
                // Places generated files in __generated__/ next to the source file
                folder: '__generated__',
                // Extension for generated files
                extension: '.ts',
                // Points to the shared base types file above
                baseTypesPath: '__generated__/globalTypes',
            },
            plugins: ['typescript-operations'],
            config: {
                // Avoids re-emitting enum/input definitions already in globalTypes.ts
                onlyOperationTypes: true,
                // Keeps strict nullability (matches current tsconfig strict:true)
                strictScalars: false,
                enumsAsTypes: false,
                // Keeps scalar types consistent with the existing project conventions
                scalars: {
                    Time: 'string',
                    Upload: 'File',
                },
            },
        },
    },
}

export default config
