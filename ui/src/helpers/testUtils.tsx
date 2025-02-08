import { MockedProvider, MockedResponse } from '@apollo/client/testing'
import { FetchPolicy, WatchQueryFetchPolicy } from '@apollo/client/core'
import { render } from '@testing-library/react'
import { MessageProvider } from '../components/messages/MessageState'
import { MemoryRouter, Route, Routes, Location, Router } from 'react-router-dom'
import React from 'react'
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom'
import { History } from 'history'

interface RenderWithProvidersOptions {
    mocks?: any[]
    initialEntries?: (string | Partial<Location>)[]
    route?: React.ReactElement
    path?: string
    history?: History
    apolloOptions?: {
        addTypename?: boolean
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
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider
            mocks={mocks}
            addTypename={apolloOptions.addTypename ?? false}
            defaultOptions={apolloOptions.defaultOptions}
        >
            {history ? (
                <Router location={history.location} navigator={history}>
                    <MessageProvider>{children}</MessageProvider>
                </Router>
            ) : (
                <MemoryRouter initialEntries={initialEntries}>
                    <MessageProvider>{children}</MessageProvider>
                </MemoryRouter>
            )}
        </MockedProvider>
    )
    return {
        ...render(
            <Wrapper>
                {route && path ? (
                    <Routes>
                        <Route path={path} element={route} />
                    </Routes>
                ) : (
                    ui
                )}
            </Wrapper>
        ),
        history,
    }
}
