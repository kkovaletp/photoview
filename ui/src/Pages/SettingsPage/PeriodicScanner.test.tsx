import { fireEvent, screen, waitFor } from '@testing-library/react'
import PeriodicScanner, {
  SCAN_INTERVAL_MUTATION,
  SCAN_INTERVAL_QUERY,
} from './PeriodicScanner'
import { renderWithProviders } from '../../helpers/testUtils'

test('Enable periodic scanner', async () => {
  const graphqlMocks = [
    {
      request: {
        query: SCAN_INTERVAL_QUERY,
      },
      result: {
        data: {
          siteInfo: { periodicScanInterval: 7380, __typename: 'SiteInfo' },
        },
      },
    },
    {
      request: {
        query: SCAN_INTERVAL_MUTATION,
        variables: { interval: 0 },
      },
      result: { data: { setPeriodicScanInterval: 0 } },
    },
    {
      request: {
        query: SCAN_INTERVAL_MUTATION,
        variables: { interval: 123 * 60 },
      },
      result: { data: { setPeriodicScanInterval: 123 * 60 } },
    },
  ]

  renderWithProviders(<PeriodicScanner />, {
    mocks: graphqlMocks,
    apolloOptions: { addTypename: true }
  })

  const enableCheckbox = screen.getByLabelText('Enable periodic scanner')
  const inputField = screen.getByLabelText('Interval value')
  const unitDropdown = screen.getByLabelText('Interval unit')

  expect(inputField).toBeDisabled()
  expect(unitDropdown).toBeDisabled()

  fireEvent.click(enableCheckbox)

  expect(inputField).toBeEnabled()
  expect(unitDropdown).toBeEnabled()

  fireEvent.change(unitDropdown, { target: { value: 'minute' } })
  fireEvent.change(inputField, { target: { value: '123' } })

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  fireEvent.keyUp(inputField, { key: 'Enter' })

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })
})
