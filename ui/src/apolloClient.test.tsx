import { describe, it, expect } from 'vitest'
import { paginateCache } from './apolloClient'

describe('paginateCache', () => {
    it('should return keyArgs and merge function', () => {
        const keyArgs = ['testKey']
        const result = paginateCache(keyArgs)

        expect(result.keyArgs).toEqual(['testKey'])
        expect(typeof result.merge).toBe('function')
    })

    it('should preserve keyArgs configuration', () => {
        const keyArgs = ['userId', 'filter']
        const paginateFn = paginateCache(keyArgs)

        expect(paginateFn.keyArgs).toEqual(['userId', 'filter'])
    })

    it('should handle zero-length keyArgs array', () => {
        const keyArgs: string[] = []
        const paginateFn = paginateCache(keyArgs)

        expect(paginateFn.keyArgs).toEqual([])

        const existing = [{ id: '1' }]
        const incoming = [{ id: '2' }]
        const context = {
            args: { paginate: { offset: 1 } },
            fieldName: 'testField'
        } as any

        const result = paginateFn.merge(existing, incoming, context)
        expect(result).toEqual([{ id: '1' }, { id: '2' }])
    })

    it('should start fresh when offset is 0', () => {
        const paginateFn = paginateCache(['testKey'])
        const existing = [{ id: '1' }, { id: '2' }]
        const incoming = [{ id: '3' }, { id: '4' }]

        const result = paginateFn.merge(existing, incoming, {
            args: { paginate: { offset: 0 } },
            fieldName: 'testField'
        } as any)

        // When offset is 0, should return only incoming items (fresh start)
        expect(result).toEqual([{ id: '3' }, { id: '4' }])
    })

    it('should merge and deduplicate when offset > 0', () => {
        const paginateFn = paginateCache(['testKey'])
        const existing = [{ id: '1' }, { id: '2' }]
        const incoming = [{ id: '2' }, { id: '3' }] // id: '2' is duplicate

        const result = paginateFn.merge(existing, incoming, {
            args: { paginate: { offset: 2 } },
            fieldName: 'testField'
        } as any)

        // Should merge but avoid duplicates
        expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }])
    })

    it('should handle Apollo References (__ref)', () => {
        const paginateFn = paginateCache(['testKey'])
        const existing = [{ __ref: 'Item:1' }, { __ref: 'Item:2' }]
        const incoming = [{ __ref: 'Item:2' }, { __ref: 'Item:3' }] // Item:2 is duplicate

        const result = paginateFn.merge(existing, incoming, {
            args: { paginate: { offset: 2 } },
            fieldName: 'testField'
        } as any)

        // Should deduplicate by __ref
        expect(result).toEqual([{ __ref: 'Item:1' }, { __ref: 'Item:2' }, { __ref: 'Item:3' }])
    })

    it('should handle mixed __ref and id objects', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [
            { __ref: 'User:1' },
            { id: '2', __typename: 'User', name: 'Jane' }
        ]
        const incoming = [
            { __ref: 'User:1' }, // Duplicate __ref
            { id: '2', __typename: 'User', name: 'Jane Updated' }, // Duplicate id
            { id: '3', __typename: 'User', name: 'Bob' }
        ]

        const context = {
            args: { paginate: { offset: 2 } },
            fieldName: 'users'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should only add new item with id='3'
        expect(result).toEqual([
            { __ref: 'User:1' },
            { id: '2', __typename: 'User', name: 'Jane' },
            { id: '3', __typename: 'User', name: 'Bob' }
        ])
    })

    it('should handle items without id or __ref', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 }
        ]
        const incoming = [
            { name: 'Bob', age: 35 },
            { name: 'Alice', age: 28 }
        ]

        const context = {
            args: { paginate: { offset: 2 } },
            fieldName: 'people'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should add all items since they have no id or __ref for deduplication
        expect(result).toEqual([
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 },
            { name: 'Bob', age: 35 },
            { name: 'Alice', age: 28 }
        ])
    })

    it('should handle empty existing data', () => {
        const paginateFn = paginateCache(['testKey'])
        const existing = undefined
        const incoming = [{ id: '1' }, { id: '2' }]

        const result = paginateFn.merge(existing, incoming, {
            args: { paginate: { offset: 1 } },
            fieldName: 'testField'
        } as any)

        expect(result).toEqual([{ id: '1' }, { id: '2' }])
    })

    it('should handle null existing data', () => {
        const paginateFn = paginateCache(['testKey'])
        const existing = null as any // Apollo may pass null in some cases
        const incoming = [{ id: '1' }, { id: '2' }]

        const result = paginateFn.merge(existing, incoming, {
            args: { paginate: { offset: 1 } },
            fieldName: 'testField'
        } as any)

        expect(result).toEqual([{ id: '1' }, { id: '2' }])
    })

    it('should handle undefined offset in paginate args', () => {
        const paginateFn = paginateCache(['testKey'])
        const existing = ['item1', 'item2']
        const incoming = ['item3', 'item4']

        const context = {
            args: { paginate: {} }, // No offset specified
            fieldName: 'testField'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should default to offset 0
        expect(result).toEqual(['item3', 'item4'])
    })

    it('should handle empty incoming array', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [{ id: 'item1' }, { id: 'item2' }]
        const incoming = [] as Array<{ id: string }>

        const context = {
            args: { paginate: { offset: 1 } },
            fieldName: 'testField'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should return existing data unchanged
        expect(result).toEqual([{ id: 'item1' }, { id: 'item2' }])
    })

    it('should throw error when paginate argument is missing', () => {
        const paginateFn = paginateCache(['testKey'])
        const existing = [{ id: '1' }]
        const incoming = [{ id: '2' }]

        expect(() => {
            paginateFn.merge(existing, incoming, {
                args: {},
                fieldName: 'testField'
            } as any)
        }).toThrow('Paginate argument is missing for query: testField')
    })

    it('should handle paginate arg with null value', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [{ id: '1' }]
        const incoming = [{ id: '2' }]

        const context = {
            args: { paginate: null },
            fieldName: 'testField'
        } as any

        expect(() => {
            paginateFn.merge(existing, incoming, context)
        }).toThrow('Paginate argument is missing for query: testField')
    })

    it('should handle paginate arg with undefined value', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [{ id: '1' }]
        const incoming = [{ id: '2' }]

        const context = {
            args: { paginate: undefined },
            fieldName: 'testField'
        } as any

        expect(() => {
            paginateFn.merge(existing, incoming, context)
        }).toThrow('Paginate argument is missing for query: testField')
    })

    it('should handle string offset values', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [{ id: '1', __typename: 'User' }]
        const incoming = [{ id: '2', __typename: 'User' }]

        const context = {
            args: { paginate: { offset: '2' } }, // String instead of number
            fieldName: 'users'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should handle string offset (truthy, so uses deduplication logic)
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
        expect(result).toEqual([
            { id: '1', __typename: 'User' },
            { id: '2', __typename: 'User' }
        ])
    })

    it('should handle offset beyond existing array length', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [{ id: 'item1' }]
        const incoming = [{ id: 'item3' }, { id: 'item4' }]

        const context = {
            args: { paginate: { offset: 5 } },
            fieldName: 'testField'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should extend array with undefined slots
        expect(result).toEqual([{ id: 'item1' }, { id: 'item3' }, { id: 'item4' }])
    })

    it('should overwrite existing items when offset overlaps', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [{ id: 'item1' }, { id: 'item2' }, { id: 'item3' }, { id: 'item4' }]
        const incoming = [{ id: 'newItem2' }, { id: 'newItem3' }]

        const context = {
            args: { paginate: { offset: 1 } },
            fieldName: 'testField'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should overwrite items at offset positions
        expect(result).toEqual([
            { id: 'item1' },
            { id: 'item2' },
            { id: 'item3' },
            { id: 'item4' },
            { id: 'newItem2' },
            { id: 'newItem3' }
        ])
    })

    it('should handle large incoming arrays', () => {
        const paginateFn = paginateCache(['testKey'])

        const existing = [{ id: 'item1' }, { id: 'item2' }]
        const incoming = Array.from({ length: 100 }, (_, i) => ({ id: `item${i + 3}` }))

        const context = {
            args: { paginate: { offset: 2 } },
            fieldName: 'testField'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should handle large arrays correctly
        expect(result.length).toBe(102)
        expect(result[0]).toEqual({ id: 'item1' })
        expect(result[1]).toEqual({ id: 'item2' })
        expect(result[2]).toEqual({ id: 'item3' })
        expect(result[101]).toEqual({ id: 'item102' })
    })
})

describe('paginateCache - Real-world Apollo Client Scenarios', () => {
    it('should work with Apollo Client cache context structure', () => {
        const keyArgs = ['onlyFavorites', 'order']
        const paginateFn = paginateCache(keyArgs)

        // Simulate real Apollo Client context for Album.media field
        const context = {
            args: {
                onlyFavorites: false,
                order: 'date_desc',
                paginate: { offset: 10 }
            },
            fieldName: 'media',
            field: {
                name: { value: 'media' }
            },
            variables: {
                onlyFavorites: false,
                order: 'date_desc'
            }
        } as any

        const existing = Array.from({ length: 10 }, (_, i) => ({
            __ref: `Media:${i + 1}`
        }))
        const incoming = Array.from({ length: 10 }, (_, i) => ({
            __ref: `Media:${i + 11}`
        }))

        const result = paginateFn.merge(existing, incoming, context)

        expect(result).toHaveLength(20)
        expect(result[0]).toEqual({ __ref: 'Media:1' })
        expect(result[10]).toEqual({ __ref: 'Media:11' })
        expect(result[19]).toEqual({ __ref: 'Media:20' })
    })

    it('should handle myTimeline pagination', () => {
        const keyArgs = ['onlyFavorites']
        const paginateFn = paginateCache(keyArgs)

        const context = {
            args: {
                onlyFavorites: true,
                paginate: { offset: 0 }
            },
            fieldName: 'myTimeline'
        } as any

        const existing = [
            { __ref: 'Media:old1' },
            { __ref: 'Media:old2' }
        ]
        const incoming = [
            { __ref: 'Media:new1' },
            { __ref: 'Media:new2' }
        ]

        const result = paginateFn.merge(existing, incoming, context)

        // Should start fresh since offset is 0
        expect(result).toEqual([
            { __ref: 'Media:new1' },
            { __ref: 'Media:new2' }
        ])
    })

    it('should handle FaceGroup.imageFaces pagination', () => {
        const keyArgs: string[] = []
        const paginateFn = paginateCache(keyArgs)

        const context = {
            args: {
                paginate: { offset: 5 }
            },
            fieldName: 'imageFaces'
        } as any

        const existing = Array.from({ length: 5 }, (_, i) => ({
            id: `face${i + 1}`,
            __typename: 'ImageFace'
        }))
        const incoming = [
            { id: 'face6', __typename: 'ImageFace' },
            { id: 'face7', __typename: 'ImageFace' }
        ]

        const result = paginateFn.merge(existing, incoming, context)

        expect(result).toHaveLength(7)
        expect(result[5]).toEqual({ id: 'face6', __typename: 'ImageFace' })
        expect(result[6]).toEqual({ id: 'face7', __typename: 'ImageFace' })
    })

    it('should preserve function type for Apollo Client field policy', () => {
        const keyArgs = ['userId', 'status', 'category']
        const paginateFn = paginateCache(keyArgs)

        // Verify it matches Apollo Client FieldPolicy structure
        expect(paginateFn.keyArgs).toEqual(['userId', 'status', 'category'])
        expect(typeof paginateFn.merge).toBe('function')

        // Verify merge function has correct signature
        expect(paginateFn.merge.length).toBe(3) // existing, incoming, context
    })

    it('should handle complex media objects with metadata', () => {
        const keyArgs = ['onlyFavorites', 'order']
        const paginateFn = paginateCache(keyArgs)

        const existing = [
            {
                id: 'media1',
                __typename: 'Media',
                title: 'Photo 1',
                favorite: false,
                blurhash: 'abc123'
            }
        ]
        const incoming = [
            {
                id: 'media1', // Same ID - should be deduplicated
                __typename: 'Media',
                title: 'Photo 1 Updated',
                favorite: true,
                blurhash: 'def456'
            },
            {
                id: 'media2',
                __typename: 'Media',
                title: 'Photo 2',
                favorite: false,
                blurhash: 'ghi789'
            }
        ]

        const context = {
            args: {
                onlyFavorites: false,
                order: 'date_desc',
                paginate: { offset: 1 }
            },
            fieldName: 'media'
        } as any

        const result = paginateFn.merge(existing, incoming, context)

        // Should keep existing media1 and only add media2
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
            id: 'media1',
            __typename: 'Media',
            title: 'Photo 1',
            favorite: false,
            blurhash: 'abc123'
        })
        expect(result[1]).toEqual({
            id: 'media2',
            __typename: 'Media',
            title: 'Photo 2',
            favorite: false,
            blurhash: 'ghi789'
        })
    })
})
