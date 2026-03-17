import { MockedProvider } from '@apollo/client/testing'
import { render, screen } from '@testing-library/react'

import * as authentication from '../../helpers/authentication'
import { ADMIN_QUERY } from './Layout'
import { MemoryRouter } from 'react-router-dom'
import MainMenu, { FACE_DETECTION_ENABLED_QUERY, MAPBOX_QUERY } from './MainMenu'

vi.mock('../../helpers/authentication.ts')

const authTokenMock = vi.mocked(authentication.authToken)

afterEach(() => {
  authTokenMock.mockClear()
})

test('Layout sidebar component', async () => {
  authTokenMock.mockImplementation(() => 'test-token')

  const mockedGraphql = [
    {
      request: {
        query: ADMIN_QUERY,
      },
      result: {
        data: {
          myUser: {
            admin: true,
          },
        },
      },
    },
    {
      request: {
        query: MAPBOX_QUERY,
      },
      result: {
        data: {
          mapboxToken: true,
        },
      },
    },
    {
      request: {
        query: FACE_DETECTION_ENABLED_QUERY,
      },
      result: {
        data: {
          siteInfo: {
            faceDetectionEnabled: true,
          },
        },
      },
    },
  ]

  render(
    //TODO: how to consistently handle the following deprecation warning: "'addTypename' is deprecated."? Sonar suggests "It is recommended to add __typename to your mock objects if it is not already defined. This ensures the cache more closely resembles the production environment", but I'm not sure that this is the consistent solution with the project code.
    <MockedProvider mocks={mockedGraphql} addTypename={false}>
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    </MockedProvider>
  )

  expect(screen.getByText('Timeline')).toBeInTheDocument()
  expect(screen.getByText('Albums')).toBeInTheDocument()

  expect(await screen.findByText('Settings')).toBeInTheDocument()
  expect(await screen.findByText('Places')).toBeInTheDocument()
})

test('Layout sidebar with disabled features', async () => {
  authTokenMock.mockImplementation(() => 'test-token')

  const disabledFeaturesMocks = [
    {
      request: { query: ADMIN_QUERY },
      result: { data: { myUser: { admin: true } } },
    },
    {
      request: { query: MAPBOX_QUERY },
      result: { data: { mapboxToken: false } },
    },
    {
      request: { query: FACE_DETECTION_ENABLED_QUERY },
      result: { data: { siteInfo: { faceDetectionEnabled: false } } },
    },
  ]

  render(
    //TODO: how to consistently handle the following deprecation warning: "'addTypename' is deprecated."? Sonar suggests "It is recommended to add __typename to your mock objects if it is not already defined. This ensures the cache more closely resembles the production environment", but I'm not sure that this is the consistent solution with the project code.
    <MockedProvider mocks={disabledFeaturesMocks} addTypename={false}>
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    </MockedProvider>
  )

  // Basic items should be present
  expect(screen.getByText('Timeline')).toBeInTheDocument()
  expect(screen.getByText('Albums')).toBeInTheDocument()
  expect(await screen.findByText('Settings')).toBeInTheDocument()

  // Conditional items should NOT be present
  expect(screen.queryByText('Places')).not.toBeInTheDocument()
  expect(screen.queryByText('People')).not.toBeInTheDocument()
})

test('Layout sidebar when unauthenticated', () => {
  authTokenMock.mockImplementation(() => '')

  render(
    //TODO: how to consistently handle the following deprecation warning: "'addTypename' is deprecated."? Sonar suggests "It is recommended to add __typename to your mock objects if it is not already defined. This ensures the cache more closely resembles the production environment", but I'm not sure that this is the consistent solution with the project code.
    <MockedProvider mocks={[]} addTypename={false}>
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    </MockedProvider>
  )

  // Only basic menu items should be present
  expect(screen.getByText('Timeline')).toBeInTheDocument()
  expect(screen.getByText('Albums')).toBeInTheDocument()
  expect(screen.getByText('Settings')).toBeInTheDocument()

  // No conditional items
  expect(screen.queryByText('Places')).not.toBeInTheDocument()
  expect(screen.queryByText('People')).not.toBeInTheDocument()
})

test('Layout sidebar handles GraphQL errors gracefully', () => {
  authTokenMock.mockImplementation(() => 'test-token')

  const errorMocks = [
    {
      request: { query: MAPBOX_QUERY },
      error: new Error('Failed to fetch mapbox data')
    },
    {
      request: { query: FACE_DETECTION_ENABLED_QUERY },
      error: new Error('Failed to fetch face detection status')
    }
  ]

  render(
    //TODO: how to consistently handle the following deprecation warning: "'addTypename' is deprecated."? Sonar suggests "It is recommended to add __typename to your mock objects if it is not already defined. This ensures the cache more closely resembles the production environment", but I'm not sure that this is the consistent solution with the project code.
    <MockedProvider mocks={errorMocks} addTypename={false}>
      <MemoryRouter>
        <MainMenu />
      </MemoryRouter>
    </MockedProvider>
  )

  // Only basic items should be present, conditional items should be hidden
  expect(screen.getByText('Timeline')).toBeInTheDocument()
  expect(screen.queryByText('Places')).not.toBeInTheDocument()
  expect(screen.queryByText('People')).not.toBeInTheDocument()
})
