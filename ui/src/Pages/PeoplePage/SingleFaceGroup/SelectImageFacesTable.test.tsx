import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import SelectImageFacesTable from './SelectImageFacesTable'
import { myFaces_myFaceGroups_imageFaces } from '../__generated__/myFaces'
import { singleFaceGroup_faceGroup_imageFaces } from './__generated__/singleFaceGroup'

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string) => fallback || key,
    }),
}))

// Mock styled-components ProtectedImage
vi.mock('../../../components/photoGallery/ProtectedMedia', () => ({
    ProtectedImage: ({ src, onClick, ...props }: any) => (
        <img
            src={src || 'data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='}
            onClick={onClick}
            data-testid="protected-image"
            {...props}
        />
    ),
}))

// Mock the primitives
vi.mock('../../../primitives/form/Checkbox', () => ({
    default: ({ label, checked, onChange }: any) => (
        <label data-testid="checkbox-label">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                data-testid="face-checkbox"
            />
            {label}
        </label>
    ),
}))

vi.mock('../../../primitives/form/Input', () => ({
    TextField: ({ value, onChange, placeholder, fullWidth, ...props }: any) => (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            data-testid="search-input"
            data-full-width={fullWidth}
            {...props}
        />
    ),
}))

vi.mock('../../../primitives/Table', () => ({
    Table: ({ children, className }: any) => (
        <table className={className} data-testid="table">{children}</table>
    ),
    TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
    TableCell: ({ children, className }: any) => (
        <td className={className} data-testid="table-cell">{children}</td>
    ),
    TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
    TableHeaderCell: ({ children, colSpan }: any) => (
        <th colSpan={colSpan} data-testid="table-header-cell">{children}</th>
    ),
    TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}))

// Mock data for testing
const mockImageFaces: myFaces_myFaceGroups_imageFaces[] = [
    {
        __typename: 'ImageFace',
        id: '1',
        media: {
            __typename: 'Media',
            id: 'media-1',
            title: 'Beach Photo',
            thumbnail: {
                __typename: 'MediaURL',
                url: '/thumbnails/beach-photo.jpg',
                width: 200,
                height: 150,
            },
        },
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0,
            maxX: 1,
            minY: 0,
            maxY: 1,
        },
    },
    {
        __typename: 'ImageFace',
        id: '2',
        media: {
            __typename: 'Media',
            id: 'media-2',
            title: 'Mountain Hiking',
            thumbnail: {
                __typename: 'MediaURL',
                url: '/thumbnails/mountain-hiking.jpg',
                width: 300,
                height: 200,
            },
        },
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0,
            maxX: 1,
            minY: 0,
            maxY: 1,
        },
    },
    {
        __typename: 'ImageFace',
        id: '3',
        media: {
            __typename: 'Media',
            id: 'media-3',
            title: 'City Sunset',
            thumbnail: {
                __typename: 'MediaURL',
                url: '/thumbnails/city-sunset.jpg',
                width: 250,
                height: 180,
            },
        },
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0,
            maxX: 1,
            minY: 0,
            maxY: 1,
        },
    },
]

const defaultProps = {
    imageFaces: mockImageFaces,
    selectedImageFaces: [],
    setSelectedImageFaces: vi.fn(),
    title: 'Test Face Group',
}

const renderComponent = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props }
    return render(
        <MockedProvider mocks={[]}>
            <SelectImageFacesTable {...mergedProps} />
        </MockedProvider>
    )
}

describe('SelectImageFacesTable', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering and Layout', () => {
        it('renders complete component structure with all elements', () => {
            renderComponent({ title: 'My Custom Title' })

            // Structure and title
            expect(screen.getAllByTestId('table')).toHaveLength(2) // Header and body tables
            expect(screen.getByText('My Custom Title')).toBeInTheDocument()

            // Search input with correct attributes
            const searchInput = screen.getByTestId('search-input')
            expect(searchInput).toHaveAttribute('placeholder', 'Search images...')
            expect(searchInput).toHaveAttribute('data-full-width', 'true')

            // Images and checkboxes for all faces
            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(mockImageFaces.length)
            expect(screen.getAllByTestId('face-checkbox')).toHaveLength(mockImageFaces.length)

            // Correct image sources and titles
            images.forEach((img, index) => {
                expect(img).toHaveAttribute('src', mockImageFaces[index].media.thumbnail?.url)
            })

            mockImageFaces.forEach((face) => {
                expect(screen.getByText(face.media.title)).toBeInTheDocument()
            })

            // Table structure and styling
            expect(screen.getByTestId('table-header')).toBeInTheDocument()
            expect(screen.getByTestId('table-body')).toBeInTheDocument()
            screen.getAllByTestId('table-header-cell').forEach(cell => {
                expect(cell).toHaveAttribute('colSpan', '2')
            })

            // CSS classes for layout
            expect(screen.getByTestId('table-body').closest('div'))
                .toHaveClass('overflow-auto', 'max-h-[500px]', 'mt-2')
        })

        it('handles empty state and missing data gracefully', () => {
            // Empty faces array
            renderComponent({ imageFaces: [] })
            expect(screen.getAllByTestId('table')).toHaveLength(2)
            expect(screen.queryAllByTestId('protected-image')).toHaveLength(0)

            // Missing thumbnails
            const facesWithMissingThumbnails = [{
                ...mockImageFaces[0],
                media: { ...mockImageFaces[0].media, thumbnail: null },
            }]

            renderComponent({ imageFaces: facesWithMissingThumbnails })
            expect(screen.getByTestId('protected-image')).toHaveAttribute(
                'src', 'data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
            )
        })
    })

    describe('Search Functionality', () => {
        it('filters faces with case-insensitive partial matching and handles all search scenarios', async () => {
            const facesWithSimilarTitles = [
                ...mockImageFaces,
                {
                    __typename: 'ImageFace' as const,
                    id: '4',
                    media: {
                        __typename: 'Media' as const,
                        id: 'media-4',
                        title: 'Beach Volleyball',
                        thumbnail: {
                            __typename: 'MediaURL' as const,
                            url: '/thumbnails/beach-volleyball.jpg',
                            width: 300,
                            height: 200,
                        },
                    },
                },
            ]

            renderComponent({ imageFaces: facesWithSimilarTitles })
            const searchInput = screen.getByTestId('search-input')

            // Case-insensitive single match
            fireEvent.change(searchInput, { target: { value: 'mountain' } })
            await waitFor(() => {
                expect(screen.getByText('Mountain Hiking')).toBeInTheDocument()
                expect(screen.queryByText('Beach Photo')).not.toBeInTheDocument()
                expect(screen.getAllByTestId('protected-image')).toHaveLength(1)
            })

            // Multiple matches with partial string
            fireEvent.change(searchInput, { target: { value: 'Beach' } })
            await waitFor(() => {
                expect(screen.getByText('Beach Photo')).toBeInTheDocument()
                expect(screen.getByText('Beach Volleyball')).toBeInTheDocument()
                expect(screen.queryByText('Mountain Hiking')).not.toBeInTheDocument()
                expect(screen.getAllByTestId('protected-image')).toHaveLength(2)
            })

            // No results
            fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
            await waitFor(() => {
                expect(screen.queryAllByTestId('protected-image')).toHaveLength(0)
            })

            // Clear search shows all
            fireEvent.change(searchInput, { target: { value: '' } })
            await waitFor(() => {
                expect(screen.getAllByTestId('protected-image')).toHaveLength(facesWithSimilarTitles.length)
            })
        })
    })

    describe('Selection and Interaction', () => {
        it('handles selection state and interactions correctly via both checkboxes and images', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({
                selectedImageFaces: [mockImageFaces[0], mockImageFaces[2]],
                setSelectedImageFaces
            })

            // Initial selection state
            const checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes[0]).toBeChecked()
            expect(checkboxes[1]).not.toBeChecked()
            expect(checkboxes[2]).toBeChecked()

            // Checkbox deselection
            fireEvent.click(checkboxes[0])
            expect(setSelectedImageFaces).toHaveBeenCalledWith(expect.any(Function))

            let updateFunction = setSelectedImageFaces.mock.calls[0][0]
            let result = updateFunction([mockImageFaces[0], mockImageFaces[2]])
            expect(result).toEqual([mockImageFaces[2]])

            // Checkbox selection
            setSelectedImageFaces.mockClear()
            fireEvent.click(checkboxes[1])
            updateFunction = setSelectedImageFaces.mock.calls[0][0]
            result = updateFunction([mockImageFaces[2]])
            expect(result).toEqual([mockImageFaces[2], mockImageFaces[1]])

            // Image click behavior matches checkbox behavior
            setSelectedImageFaces.mockClear()
            const firstImage = screen.getAllByTestId('protected-image')[1]
            fireEvent.click(firstImage)

            const imageUpdateFunction = setSelectedImageFaces.mock.calls[0][0]
            const imageResult = imageUpdateFunction([mockImageFaces[2]])
            expect(imageResult).toEqual([mockImageFaces[2], mockImageFaces[1]])
        })

        it('maintains selection state during search and handles selection inconsistencies', async () => {
            const nonExistentFace = {
                __typename: 'ImageFace' as const,
                id: 'non-existent',
                media: {
                    __typename: 'Media' as const,
                    id: 'non-existent-media',
                    title: 'Non-existent',
                    thumbnail: null,
                },
            }

            renderComponent({
                selectedImageFaces: [nonExistentFace, mockImageFaces[0]]
            })

            // Selection state with inconsistencies
            const checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes[0]).toBeChecked() // Existing face is checked
            expect(checkboxes[1]).not.toBeChecked()
            expect(checkboxes[2]).not.toBeChecked()

            // Selection persists during search
            const searchInput = screen.getByTestId('search-input')
            fireEvent.change(searchInput, { target: { value: 'Beach' } })

            await waitFor(() => {
                const filteredCheckboxes = screen.getAllByTestId('face-checkbox')
                expect(filteredCheckboxes).toHaveLength(1)
                expect(filteredCheckboxes[0]).toBeChecked()
            })
        })
    })

    describe('Component Integration and Props', () => {
        it('integrates with GraphQL types and handles prop updates', () => {
            // Test with different GraphQL types
            const typedFaces = mockImageFaces as unknown as singleFaceGroup_faceGroup_imageFaces[]
            expect(() => renderComponent({ imageFaces: typedFaces })).not.toThrow()

            // Test prop updates
            const { unmount } = renderComponent({ title: 'Original Title' })
            expect(screen.getByText('Original Title')).toBeInTheDocument()
            unmount()

            renderComponent({
                title: "Updated Title",
                selectedImageFaces: [mockImageFaces[1]],
                imageFaces: [mockImageFaces[0]]
            })

            expect(screen.getByText('Updated Title')).toBeInTheDocument()
            expect(screen.queryByText('Original Title')).not.toBeInTheDocument()
            expect(screen.getAllByTestId('protected-image')).toHaveLength(1)
            expect(screen.getByText('Beach Photo')).toBeInTheDocument()
        })

        it('provides accessibility features and handles performance scenarios', () => {
            renderComponent()

            // Accessibility - proper labels and focus
            mockImageFaces.forEach((face) => {
                const labelElement = screen.getByText(face.media.title)
                    .closest('[data-testid="checkbox-label"]')
                expect(labelElement).toBeInTheDocument()
                expect(labelElement?.querySelector('[data-testid="face-checkbox"]')).toBeInTheDocument()
            })

            const searchInput = screen.getByTestId('search-input')
            searchInput.focus()
            expect(document.activeElement).toBe(searchInput)

            // Performance - rapid search changes don't trigger selection callbacks
            const setSelectedImageFaces = vi.fn()
            renderComponent({ setSelectedImageFaces })

            fireEvent.change(searchInput, { target: { value: 'B' } })
            fireEvent.change(searchInput, { target: { value: 'Be' } })
            fireEvent.change(searchInput, { target: { value: 'Bea' } })
            fireEvent.change(searchInput, { target: { value: 'Beac' } })
            fireEvent.change(searchInput, { target: { value: 'Beach' } })

            expect(setSelectedImageFaces).not.toHaveBeenCalled()
        })
    })
})
