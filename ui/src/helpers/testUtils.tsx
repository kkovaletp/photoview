import { MockedProvider, MockedResponse } from '@apollo/client/testing'
import { FetchPolicy, WatchQueryFetchPolicy } from '@apollo/client/core'
import { render } from '@testing-library/react'
import { MessageProvider } from '../components/messages/MessageState'
import { MemoryRouter, Route, Routes, Location } from 'react-router-dom'
import React from 'react'
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom'
import { History } from 'history'

interface RenderWithProvidersOptions {
    mocks?: MockedResponse[]
    initialEntries?: (string | Partial<Location>)[]
    route?: React.ReactElement
    path?: string
    history?: History
    apolloOptions?: {
        addTypename?: boolean
        defaultOptions?: {
            watchQuery?: { fetchPolicy?: WatchQueryFetchPolicy }
            query?: { fetchPolicy?: FetchPolicy }
        }
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
    ui: React.ReactNode,
    {
        mocks = [],
        initialEntries = ['/'],
        route,
        path,
        history,
        apolloOptions = {},
    }: RenderWithProvidersOptions = {}
) {
    if ((route && !path) || (!route && path)) {
        throw new Error('Both route and path must be provided together');
    }
    const Router = history ?
        ({ children }: { children: React.ReactNode }) => (
            <HistoryRouter history={history}>{children}</HistoryRouter>
        ) :
        ({ children }: { children: React.ReactNode }) => (
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        );
    return render(
        <MockedProvider
            mocks={mocks}
            addTypename={apolloOptions.addTypename ?? false}
            defaultOptions={apolloOptions.defaultOptions}
        >
            <MemoryRouter initialEntries={initialEntries}>
                <MessageProvider>
                    {route && path ? (
                        <Routes>
                            <Route path={path} element={route} />
                        </Routes>
                    ) : (
                        ui
                    )}
                </MessageProvider>
            </MemoryRouter>
        </MockedProvider>
    )
}
