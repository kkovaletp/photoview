import { MockedProvider } from '@apollo/client/testing/react'
import { render } from '@testing-library/react'
import { MessageProvider } from '../components/messages/MessageState'
import { MemoryRouter, Route, Routes, Location } from 'react-router-dom'
import { ReactElement, ReactNode } from 'react'

/**
 * Options for configuring the test environment in renderWithProviders.
 */
interface RenderWithProvidersOptions {
    /** Apollo GraphQL mocks */
    mocks?: any[]
    /** Initial router entries for MemoryRouter */
    initialEntries?: (string | Partial<Location>)[]
    /** Route element to render */
    route?: ReactElement
    /** Path for the route */
    path?: string
    /** Apollo client configuration options */
    apolloOptions?: {
        defaultOptions?: any
    }
}

/**
 * Renders a component with common providers needed for testing.
 * @param ui - The React component to render
 * @param options - Configuration options for the test environment
 * @param options.mocks - Apollo GraphQL mocks
 * @param options.initialEntries - Initial router entries
 * @param options.route - Route element to render
 * @param options.path - Path for the route
 * @param options.apolloOptions - Apollo client configuration
 * @returns The rendered component with testing utilities
 */
export function renderWithProviders(
    ui: ReactNode,
    {
        mocks = [],
        initialEntries = ['/'],
        route,
        path,
        apolloOptions = {},
    }: RenderWithProvidersOptions = {}
) {
    if ((route && !path) || (!route && path)) {
        throw new Error('Both route and path must be provided together');
    }
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <MockedProvider
            mocks={mocks}
            defaultOptions={apolloOptions.defaultOptions}
        >
            <MemoryRouter initialEntries={initialEntries}>
                <MessageProvider>{children}</MessageProvider>
            </MemoryRouter>
        </MockedProvider>
    )
    return render(
        <Wrapper>
            {route && path ? (
                <Routes>
                    <Route path={path} element={route} />
                </Routes>
            ) : (
                ui
            )}
        </Wrapper>
    )
}
