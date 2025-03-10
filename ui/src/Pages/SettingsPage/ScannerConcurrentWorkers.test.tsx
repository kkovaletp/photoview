import { renderWithProviders } from '../../helpers/testUtils'
import { screen } from '@testing-library/react'

import {
  CONCURRENT_WORKERS_QUERY,
  SET_CONCURRENT_WORKERS_MUTATION,
  ScannerConcurrentWorkers,
} from './ScannerConcurrentWorkers'

test('load ScannerConcurrentWorkers', () => {
  const graphqlMocks = [
    {
      request: {
        query: CONCURRENT_WORKERS_QUERY,
      },
      result: {
        data: {
          siteInfo: { concurrentWorkers: 3 },
        },
      },
    },
    {
      request: {
        query: SET_CONCURRENT_WORKERS_MUTATION,
        variables: {
          workers: '1',
        },
      },
      result: {
        data: {},
      },
    },
  ]
  renderWithProviders(<ScannerConcurrentWorkers />, {
    mocks: graphqlMocks,
    apolloOptions: {
      addTypename: false,
      defaultOptions: {
        watchQuery: { fetchPolicy: 'no-cache' },
        query: { fetchPolicy: 'no-cache' }
      }
    }
  })

  expect(screen.getByText('Scanner concurrent workers')).toBeInTheDocument()
})
