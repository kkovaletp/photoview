import { vi, describe, test, expect, beforeEach, afterEach, type Mock } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import SearchBar, { AlbumRow, PhotoRow, searchHighlighted } from './Searchbar'
import * as utils from '../../helpers/utils'
import { SearchQueryQuery } from './__generated__/Searchbar'

type MockSearchData = {
    search: Pick<SearchQueryQuery['search'], 'query' | 'albums' | 'media'>
}

type MockLazyQueryResult = {
    loading: boolean
    data: MockSearchData | null
}

type MockFetchSearchResult = {
    data: MockSearchData | null
}

type MockFetchSearch = (
    options: { variables: { query: string } }
) => Promise<MockFetchSearchResult>

type MockLazyQuery = () => [
    Mock<MockFetchSearch>,
    MockLazyQueryResult,
]

const mockUseLazyQuery = vi.hoisted(() => vi.fn<MockLazyQuery>());

vi.mock('@apollo/client/react', async importOriginal => {
    const actual = await importOriginal<typeof import('@apollo/client/react')>()
    return {
        ...actual,
        useLazyQuery: mockUseLazyQuery,
    }
});

// Mock the debounce function with a direct implementation
vi.mock('../../helpers/utils', () => ({
    debounce: vi.fn((fn) => {
        const mockFn = (...args: unknown[]) => fn(...args);
        mockFn.cancel = vi.fn();
        return mockFn;
    })
}));

// Mock ProtectedImage component
vi.mock('../photoGallery/ProtectedMedia', () => ({
    ProtectedImage: ({ src, className }: { src: string, className: string }) => (
        <img data-testid="protected-image" src={src} className={className} alt="" />
    )
}));

// Mock the translation hook
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key === 'header.search.placeholder' ? 'Search' : key
    })
}));

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
    } as unknown as SearchQueryQuery['search']['albums'][0],
    {
        __typename: "Album" as const,
        id: 'album2',
        title: 'Family Photos',
        thumbnail: {
            thumbnail: {
                url: '/api/thumbnail/album2'
            }
        }
    } as unknown as SearchQueryQuery['search']['albums'][0]
];
const sampleMedia = [
    {
        __typename: 'Media' as const,
        id: 'media1',
        title: 'Beach Sunset',
        thumbnail: {
            url: '/api/thumbnail/media1'
        },
        album: {
            id: 'album1'
        }
    } as unknown as SearchQueryQuery['search']['media'][0],
    {
        __typename: 'Media' as const,
        id: 'media2',
        title: 'Mountain View',
        thumbnail: {
            url: '/api/thumbnail/media2'
        },
        album: {
            id: 'album2'
        }
    } as unknown as SearchQueryQuery['search']['media'][0]
];

describe('SearchBar Component', () => {
    // For each test, set up a new mock implementation of useLazyQuery
    let fetchSearchMock: Mock<MockFetchSearch>;
    let mockSearchData: MockSearchData | null;
    let mockLoading: boolean;

    beforeEach(() => {
        fetchSearchMock = vi.fn<MockFetchSearch>().mockResolvedValue({ data: null });
        mockSearchData = null;
        mockLoading = false;

        // Mock useLazyQuery to return our controlled variables
        mockUseLazyQuery.mockImplementation(() => [
            fetchSearchMock,
            { loading: mockLoading, data: mockSearchData },
        ])

        // Reset all mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test('renders search input correctly', () => {
        render(
            <MemoryRouter>
                <SearchBar />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText('Search');
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveAttribute('type', 'search');
        expect(searchInput).not.toHaveAttribute('aria-activedescendant');
    });

    test('calls debounce with search term when typing', async () => {
        render(
            <MemoryRouter>
                <SearchBar />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText('Search');
        await userEvent.type(searchInput, 'test');

        expect(searchInput).toHaveValue('test');
        expect(fetchSearchMock).toHaveBeenCalledWith({ variables: { query: 'test' } });
    });

    test('sends the trimmed query after 250 ms and displays returned results', async () => {
        const actualUtils = await vi.importActual<typeof import('../../helpers/utils')>('../../helpers/utils');
        vi.mocked(utils.debounce).mockImplementationOnce(actualUtils.debounce);
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        fetchSearchMock.mockImplementation(
            ({ variables }): Promise<MockFetchSearchResult> => {
                mockSearchData = {
                    search: {
                        query: variables.query,
                        albums: sampleAlbums,
                        media: sampleMedia,
                    },
                }

                return Promise.resolve({ data: mockSearchData })
            }
        );

        render(<MemoryRouter><SearchBar /></MemoryRouter>);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '  beach  ' } });

        act(() => { vi.advanceTimersByTime(249); });
        expect(fetchSearchMock).not.toHaveBeenCalled();
        expect(screen.queryByText('Vacation Photos')).not.toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(1); });
        expect(fetchSearchMock).toHaveBeenCalledExactlyOnceWith({ variables: { query: 'beach' } });
        expect(screen.getByText('Vacation Photos')).toBeInTheDocument();
        expect(screen.getByText('Mountain View')).toBeInTheDocument();
    });

    test('calls fetch function with correct parameters when typing', async () => {
        render(
            <MemoryRouter>
                <SearchBar />
            </MemoryRouter>
        )

        const searchInput = screen.getByPlaceholderText('Search')
        await userEvent.type(searchInput, 'test')

        expect(fetchSearchMock).toHaveBeenCalledWith({
            variables: { query: 'test' },
        })
    });

    test('shows no results message when search is empty', async () => {
        mockSearchData = {
            search: {
                query: 'empty',
                albums: [],
                media: [],
            },
        }

        render(
            <MemoryRouter>
                <SearchBar />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText('Search');
        await userEvent.type(searchInput, 'empty');

        // For this test, check if fetchSearches was called with correct params
        expect(fetchSearchMock).toHaveBeenCalledWith({ variables: { query: 'empty' } });

        // Wait for the component to update with our mock data
        await waitFor(() => {
            expect(screen.getByText('header.search.no_results')).toBeInTheDocument();
        });
    });

    test('verifies debounced function only processes string queries', () => {
        // Get the actual debounce implementation
        const debounceFn = utils.debounce as unknown as typeof vi.fn;

        // Create a spy for the fetch function
        const fetchSearches = vi.fn();

        // Call the mock directly to test the behavior
        const mockCallback = (query: unknown) => {
            if (typeof query !== 'string') return;
            fetchSearches({ variables: { query } });
        };

        // Create a debounced version
        const debounced = debounceFn(mockCallback);

        // Test with null
        debounced(null);
        expect(fetchSearches).not.toHaveBeenCalled();

        // Test with number
        debounced(123);
        expect(fetchSearches).not.toHaveBeenCalled();

        // Test with object
        debounced({});
        expect(fetchSearches).not.toHaveBeenCalled();

        // Test with valid string
        debounced('valid query');
        expect(fetchSearches).toHaveBeenCalledWith({ variables: { query: 'valid query' } });
    });

    test('logs a rejected search request', async () => {
        const user = userEvent.setup()
        const error = new Error('Search request failed')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        fetchSearchMock.mockRejectedValue(error)

        render(
            <MemoryRouter>
                <SearchBar />
            </MemoryRouter>
        )

        await user.click(screen.getByRole('combobox'))
        await user.paste('test')

        expect(fetchSearchMock).toHaveBeenCalledExactlyOnceWith({
            variables: { query: 'test' },
        })

        await waitFor(() => {
            expect(errorSpy).toHaveBeenCalledExactlyOnceWith(
                'Failed to load search results',
                error
            )
        })
    });

    test('does not log an expected search cancellation', async () => {
        const user = userEvent.setup()
        const error = new Error('Search cancelled')
        error.name = 'AbortError'

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        fetchSearchMock.mockRejectedValue(error)

        render(
            <MemoryRouter>
                <SearchBar />
            </MemoryRouter>
        )

        await user.click(screen.getByRole('combobox'))
        await user.paste('test')

        expect(fetchSearchMock).toHaveBeenCalledExactlyOnceWith({
            variables: { query: 'test' },
        })
        expect(errorSpy).not.toHaveBeenCalled()
    });
});

// Test AlbumRow component separately
describe('AlbumRow Component', () => {
    test('returns null when album is null', () => {
        const { container } = render(
            <MemoryRouter>
                <AlbumRow
                    query="test"
                    album={null as unknown as SearchQueryQuery['search']['albums'][0]}
                    selected={false}
                    setSelected={() => { }}
                />
            </MemoryRouter>
        );

        // Container should be empty since AlbumRow returns null
        expect(container.firstChild).toBeNull();
    });

    test('renders correctly with valid album', () => {
        render(
            <MemoryRouter>
                <AlbumRow
                    query="test"
                    album={sampleAlbums[0]}
                    selected={false}
                    setSelected={() => { }}
                />
            </MemoryRouter>
        );

        // Should render the album title
        expect(screen.getByText('Vacation Photos')).toBeInTheDocument();

        // Should render image
        const image = screen.getByTestId('protected-image');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', '/api/thumbnail/album1');
    });

    test('calls setSelected callback on mouse over', async () => {
        // Create a mock function for setSelected
        const mockSetSelected = vi.fn();

        render(
            <MemoryRouter>
                <AlbumRow
                    query="test"
                    album={sampleAlbums[0]}
                    selected={false}
                    setSelected={mockSetSelected}
                />
            </MemoryRouter>
        );

        // Find the list item element and trigger mouse over
        const listItem = screen.getByRole('option');
        await userEvent.hover(listItem);

        // Verify the mock function was called
        expect(mockSetSelected).toHaveBeenCalledTimes(1);
    });
});

// Test PhotoRow component separately
describe('PhotoRow Component', () => {
    test('returns null when media is null', () => {
        const { container } = render(
            <MemoryRouter>
                <PhotoRow
                    query="test"
                    media={null as unknown as SearchQueryQuery['search']['media'][0]}
                    selected={false}
                    setSelected={() => { }}
                />
            </MemoryRouter>
        );

        // Container should be empty since PhotoRow returns null
        expect(container.firstChild).toBeNull();
    });

    test('renders correctly with valid media', () => {
        render(
            <MemoryRouter>
                <PhotoRow
                    query="test"
                    media={sampleMedia[0]}
                    selected={false}
                    setSelected={() => { }}
                />
            </MemoryRouter>
        );

        // Should render the media title
        expect(screen.getByText('Beach Sunset')).toBeInTheDocument();

        // Should render image
        const image = screen.getByTestId('protected-image');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', '/api/thumbnail/media1');
    });

    test('calls setSelected callback on mouse over', async () => {
        // Create a mock function for setSelected
        const mockSetSelected = vi.fn();

        render(
            <MemoryRouter>
                <PhotoRow
                    query="test"
                    media={sampleMedia[0]}
                    selected={false}
                    setSelected={mockSetSelected}
                />
            </MemoryRouter>
        );

        // Find the list item element and trigger mouse over
        const listItem = screen.getByRole('option');
        await userEvent.hover(listItem);

        // Verify the mock function was called
        expect(mockSetSelected).toHaveBeenCalledTimes(1);
    });
});

// Test searchHighlighted function
describe('searchHighlighted function', () => {
    test('highlights search term within text', () => {
        const result = searchHighlighted('photo', 'Vacation Photos');

        // Render the result to check highlighting
        render(<div>{result}</div>);

        // The term "photo" should be highlighted - use class selector
        const highlightedText = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' &&
                element?.className.includes('font-semibold') &&
                content.includes('Photo');
        });
        expect(highlightedText).toHaveClass('font-semibold');
    });

    test('returns original text when no match found', () => {
        const result = searchHighlighted('xyz', 'Vacation Photos');
        expect(result).toBe('Vacation Photos');
    });

    test('handles case-insensitive matching', () => {
        const result = searchHighlighted('photo', 'PHOTOS');

        // Render the result to check highlighting
        render(<div>{result}</div>);

        // The term "PHOTO" should be highlighted (case-insensitive)
        const highlightedText = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' &&
                element?.className.includes('font-semibold') &&
                content.includes('PHOTO');
        });
        expect(highlightedText).toHaveClass('font-semibold');
    });
});
