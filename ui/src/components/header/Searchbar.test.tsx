import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from '../../helpers/testUtils'
import SearchBar, { SEARCH_QUERY, AlbumRow, searchHighlighted } from './Searchbar'
import * as utils from '../../helpers/utils'
import { searchQuery_search_albums, searchQuery_search_media } from './__generated__/searchQuery'

// Module-level mock for fetchSearches
const fetchMock = vi.fn();

// Mock the Apollo Client
vi.mock('@apollo/client', async () => {
    const actual = await vi.importActual('@apollo/client') as object;
    return {
        ...actual,
        useLazyQuery: () => [fetchMock, { loading: false, data: null }]
    };
});

// Mock the debounce function
vi.mock('../../helpers/utils', async () => {
    const actual = await vi.importActual('../../helpers/utils') as object
    return {
        ...actual,
        debounce: vi.fn((fn) => {
            const mockDebounced = (...args: unknown[]) => {
                fn(...args)
            }
            mockDebounced.cancel = vi.fn()
            return mockDebounced
        })
    }
})

// Mock the ProtectedImage component
vi.mock('../photoGallery/ProtectedMedia', () => ({
    ProtectedImage: ({ src, className }: { src: string, className: string }) => (
        <img data-testid="protected-image" src={src} className={className} alt="" />
    )
}))

// Mock hooks
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key })
}))

// Sample test data
const sampleAlbums = [
    {
        __typename: "Album" as const,
        id: 'album1',
        title: 'Vacation Photos',
        thumbnail: {
            thumbnail: {
                url: '/api/thumbnail/album1'
            }
        }
    } as unknown as searchQuery_search_albums,
    {
        __typename: "Album" as const,
        id: 'album2',
        title: 'Family Photos',
        thumbnail: {
            thumbnail: {
                url: '/api/thumbnail/album2'
            }
        }
    } as unknown as searchQuery_search_albums
]

const sampleMedia = [
    {
        __typename: "Media" as const,
        id: 'media1',
        title: 'Beach Sunset',
        thumbnail: {
            url: '/api/thumbnail/media1'
        },
        album: {
            id: 'album1'
        }
    } as unknown as searchQuery_search_media,
    {
        __typename: "Media" as const,
        id: 'media2',
        title: 'Mountain View',
        thumbnail: {
            url: '/api/thumbnail/media2'
        },
        album: {
            id: 'album2'
        }
    } as unknown as searchQuery_search_media
]

// Create GraphQL mocks
const createSearchMocks = (query: string, results: { albums: any[], media: any[] }) => [
    {
        request: {
            query: SEARCH_QUERY,
            variables: { query }
        },
        result: {
            data: {
                search: {
                    query,
                    albums: results.albums,
                    media: results.media
                }
            }
        }
    }
]

describe('SearchBar Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        fetchMock.mockClear();
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('renders search input correctly', () => {
        renderWithProviders(<SearchBar />, {
            mocks: [],
            initialEntries: ['/']
        })
        const searchInput = screen.getByPlaceholderText('header.search.placeholder')
        expect(searchInput).toBeInTheDocument()
        expect(searchInput).toHaveAttribute('type', 'search')
    })

    test('handles input changes', async () => {
        renderWithProviders(<SearchBar />, {
            mocks: createSearchMocks('test', { albums: [], media: [] }),
            initialEntries: ['/']
        })

        const searchInput = screen.getByPlaceholderText('header.search.placeholder')
        await userEvent.type(searchInput, 'test')
        expect(searchInput).toHaveValue('test')
    })

    test('shows loading state while fetching results', async () => {
        const delayedMock = [
            {
                request: {
                    query: SEARCH_QUERY,
                    variables: { query: 'test' }
                },
                result: {
                    data: {
                        search: {
                            query: 'test',
                            albums: [],
                            media: []
                        }
                    }
                },
                delay: 100 // Add delay to simulate network
            }
        ]

        renderWithProviders(<SearchBar />, {
            mocks: delayedMock,
            initialEntries: ['/']
        })

        const searchInput = screen.getByPlaceholderText('header.search.placeholder')
        await userEvent.type(searchInput, 'test')

        // Check for loading message
        await waitFor(() => {
            expect(screen.getByText('header.search.loading')).toBeInTheDocument()
        })

        // Wait for results
        await waitFor(() => {
            expect(screen.queryByText('header.search.loading')).not.toBeInTheDocument()
        }, { timeout: 200 })
    })

    test('shows "No results found" when search returns empty results', async () => {
        renderWithProviders(<SearchBar />, {
            mocks: createSearchMocks('empty', { albums: [], media: [] }),
            initialEntries: ['/']
        })

        const searchInput = screen.getByPlaceholderText('header.search.placeholder')
        await userEvent.type(searchInput, 'empty')

        // Check for no results message
        await waitFor(() => {
            expect(screen.getByText('header.search.no_results')).toBeInTheDocument()
        })
    })

    test('displays search results correctly when found', async () => {
        renderWithProviders(<SearchBar />, {
            mocks: createSearchMocks('photo', {
                albums: sampleAlbums,
                media: sampleMedia
            }),
            initialEntries: ['/']
        })

        const searchInput = screen.getByPlaceholderText('header.search.placeholder')
        await userEvent.type(searchInput, 'photo')

        // Wait for results headers
        await waitFor(() => {
            expect(screen.getByText('header.search.result_type.albums')).toBeInTheDocument()
            expect(screen.getByText('header.search.result_type.media')).toBeInTheDocument()
        })

        // Check for album titles
        expect(screen.getByText('Vacation Photos')).toBeInTheDocument()
        expect(screen.getByText('Family Photos')).toBeInTheDocument()

        // Check for media titles
        expect(screen.getByText('Beach Sunset')).toBeInTheDocument()
        expect(screen.getByText('Mountain View')).toBeInTheDocument()
    })

    test('handles keyboard navigation through results', async () => {
        renderWithProviders(<SearchBar />, {
            mocks: createSearchMocks('photo', {
                albums: sampleAlbums,
                media: sampleMedia
            }),
            initialEntries: ['/']
        })

        const searchInput = screen.getByPlaceholderText('header.search.placeholder')
        await userEvent.type(searchInput, 'photo')

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('header.search.result_type.albums')).toBeInTheDocument()
        })

        // Focus the input to ensure keyboard events work
        searchInput.focus()

        // Press ArrowDown to select first item
        fireEvent.keyDown(document, { key: 'ArrowDown' })

        // Verify first item is selected
        const options = screen.getAllByRole('option')
        expect(options[0]).toHaveAttribute('aria-selected', 'true')

        // Press ArrowDown again to select second item
        fireEvent.keyDown(document, { key: 'ArrowDown' })

        // Verify second item is selected
        expect(options[1]).toHaveAttribute('aria-selected', 'true')

        // Press ArrowUp to go back to first item
        fireEvent.keyDown(document, { key: 'ArrowUp' })

        // Verify first item is selected again
        expect(options[0]).toHaveAttribute('aria-selected', 'true')
    })

    test('handles Escape key to dismiss results', async () => {
        renderWithProviders(<SearchBar />, {
            mocks: createSearchMocks('photo', {
                albums: sampleAlbums,
                media: []
            }),
            initialEntries: ['/']
        })

        const searchInput = screen.getByPlaceholderText('header.search.placeholder')
        await userEvent.type(searchInput, 'photo')

        // Wait for results
        await waitFor(() => {
            expect(screen.getByText('header.search.result_type.albums')).toBeInTheDocument()
        })

        // Focus the input
        searchInput.focus()

        // Verify results are shown
        const resultsContainer = screen.getByRole('listbox')
        expect(resultsContainer).not.toHaveClass('hidden')

        // Press Escape
        fireEvent.keyDown(document, { key: 'Escape' })

        // Results should be hidden (input loses focus)
        expect(resultsContainer).toHaveClass('hidden')
    })

    // Test PR changes - Type checking in debounced function
    test('debounced function only processes string queries', async () => {
        // Get access to the mocked debounce function
        const debounceMock = vi.mocked(utils.debounce)

        // Get the function passed to debounce
        const debouncedFn = debounceMock.mock.calls[0][0]

        // Test with null
        debouncedFn(null)
        expect(fetchMock).not.toHaveBeenCalled()

        // Test with number
        debouncedFn(123)
        expect(fetchMock).not.toHaveBeenCalled()

        // Test with object
        debouncedFn({})
        expect(fetchMock).not.toHaveBeenCalled()

        // Test with valid string
        debouncedFn('valid query')
        expect(fetchMock).toHaveBeenCalledWith({ variables: { query: 'valid query' } })
    })
})

// Test AlbumRow component separately
describe('AlbumRow Component', () => {
    test('returns null when album is null', () => {
        // Create a separate container to check if anything renders
        const { container } = renderWithProviders(
            <AlbumRow
                query="test"
                album={null as unknown as searchQuery_search_albums}
                selected={false}
                setSelected={() => { }}
            />,
            { initialEntries: ['/'] }
        )

        // Container should be empty since AlbumRow returns null
        expect(container.firstChild).toBeNull()
    })

    test('renders correctly with valid album', () => {
        renderWithProviders(
            <AlbumRow
                query="test"
                album={sampleAlbums[0]}
                selected={false}
                setSelected={() => { }}
            />,
            { initialEntries: ['/'] }
        )

        // Should render the album title
        expect(screen.getByText('Vacation Photos')).toBeInTheDocument()

        // Should render image
        const image = screen.getByTestId('protected-image')
        expect(image).toBeInTheDocument()
        expect(image).toHaveAttribute('src', '/api/thumbnail/album1')
    })
})

// Test searchHighlighted function
describe('searchHighlighted function', () => {
    test('highlights search term within text', () => {
        const result = searchHighlighted('photo', 'Vacation Photos')

        // Render the result to check highlighting
        renderWithProviders(<div>{result}</div>, { initialEntries: ['/'] })

        // The term "photo" should be highlighted - use a more flexible matcher
        const highlightedText = screen.getByText(/photo/i, { selector: '.font-semibold' })
        expect(highlightedText).toHaveClass('font-semibold')
    })

    test('returns original text when no match found', () => {
        const result = searchHighlighted('xyz', 'Vacation Photos')
        expect(result).toBe('Vacation Photos')
    })

    test('handles case-insensitive matching', () => {
        const result = searchHighlighted('photo', 'PHOTOS')

        // Render the result to check highlighting
        renderWithProviders(<div>{result}</div>, { initialEntries: ['/'] })

        // The term "PHOTO" should be highlighted (case-insensitive)
        const highlightedText = screen.getByText(/PHOTO/i, { selector: '.font-semibold' })
        expect(highlightedText).toHaveClass('font-semibold')
    })
})
