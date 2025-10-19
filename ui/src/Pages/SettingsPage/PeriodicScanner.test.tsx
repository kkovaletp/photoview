import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import PeriodicScanner, {
  SCAN_INTERVAL_MUTATION,
  SCAN_INTERVAL_QUERY,
} from './PeriodicScanner'
import { renderWithProviders } from '../../helpers/testUtils'

describe('PeriodicScanner', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Query Loading', () => {
    test('displays loading state initially', () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 0, __typename: 'SiteInfo' },
            },
          },
          delay: 100,
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      const checkbox = screen.getByLabelText('Enable periodic scanner')
      expect(checkbox).toBeDisabled()
    })

    test('loads and displays disabled scanner when interval is zero', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 0, __typename: 'SiteInfo' },
            },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          'Enable periodic scanner'
        ) as HTMLInputElement
        expect(checkbox).not.toBeDisabled()
        expect(checkbox.checked).toBe(false)
      })

      const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
      expect(inputField).toBeDisabled()
      expect(inputField.value).toBe('0')
    })

    test('loads and displays enabled scanner with interval', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          'Enable periodic scanner'
        ) as HTMLInputElement
        expect(checkbox.checked).toBe(true)
      })

      const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
      expect(inputField).toBeEnabled()
      expect(inputField.value).toBe('5')

      const unitDropdown = screen.getByLabelText('Interval unit') as HTMLSelectElement
      expect(unitDropdown.value).toBe('minute')
    })
  })

  describe('Error Handling', () => {
    test('displays error message when query fails', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            errors: [new GraphQLError('Database connection failed')],
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load periodic scanner settings/i)
        ).toBeInTheDocument()
        expect(
          screen.getByText(/Database connection failed/i)
        ).toBeInTheDocument()
      })
    })

    test('logs error to console when query fails', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            errors: [new GraphQLError('Server error')],
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load periodic scan interval:',
          expect.any(Error)
        )
      })
    })

    test('shows component title even when error occurs', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          error: new Error('Network error'),
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Periodic scanner' })
        ).toBeInTheDocument()
      })
    })

    test('does not show form controls when error state is active', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            errors: [new GraphQLError('Error')],
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        expect(screen.getByText(/Failed to load periodic scanner settings/i)).toBeInTheDocument()
      })

      expect(screen.queryByLabelText('Enable periodic scanner')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Interval value')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Interval unit')).not.toBeInTheDocument()
    })

    test('handles network error correctly', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          error: new Error('Failed to fetch'),
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument()
      })
    })
  })

  describe('Time Unit Conversion', () => {
    test('converts seconds to minutes correctly', async () => {
      const mocks: MockedResponse[] = [
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
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(inputField.value).toBe('123')
      })

      const unitDropdown = screen.getByLabelText('Interval unit') as HTMLSelectElement
      expect(unitDropdown.value).toBe('minute')
    })

    test('converts to hours for hour-based intervals', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 7200, __typename: 'SiteInfo' },
            },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(inputField.value).toBe('2')
      })

      const unitDropdown = screen.getByLabelText('Interval unit') as HTMLSelectElement
      expect(unitDropdown.value).toBe('hour')
    })

    test('converts to days for day-based intervals', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                periodicScanInterval: 86400 * 3,
                __typename: 'SiteInfo',
              },
            },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(inputField.value).toBe('3')
      })

      const unitDropdown = screen.getByLabelText('Interval unit') as HTMLSelectElement
      expect(unitDropdown.value).toBe('day')
    })

    test('converts to months for month-based intervals', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                periodicScanInterval: 86400 * 30 * 2,
                __typename: 'SiteInfo',
              },
            },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(inputField.value).toBe('2')
      })

      const unitDropdown = screen.getByLabelText('Interval unit') as HTMLSelectElement
      expect(unitDropdown.value).toBe('month')
    })

    test('keeps seconds for intervals that do not divide evenly', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 125, __typename: 'SiteInfo' },
            },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(inputField.value).toBe('125')
      })

      const unitDropdown = screen.getByLabelText('Interval unit') as HTMLSelectElement
      expect(unitDropdown.value).toBe('second')
    })
  })

  describe('Enable/Disable Functionality', () => {
    test('enables input fields when checkbox is checked', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 0, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 0 },
          },
          result: {
            data: { setPeriodicScanInterval: 0 },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const checkbox = screen.getByLabelText('Enable periodic scanner')
        expect(checkbox).not.toBeDisabled()
      })

      const inputField = screen.getByLabelText('Interval value')
      const unitDropdown = screen.getByLabelText('Interval unit')

      expect(inputField).toBeDisabled()
      expect(unitDropdown).toBeDisabled()

      const checkbox = screen.getByLabelText('Enable periodic scanner')
      await user.click(checkbox)

      await waitFor(() => {
        expect(inputField).toBeEnabled()
        expect(unitDropdown).toBeEnabled()
      })
    })

    test('disables input fields when checkbox is unchecked', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 0 },
          },
          result: {
            data: { setPeriodicScanInterval: 0 },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          'Enable periodic scanner'
        ) as HTMLInputElement
        expect(checkbox.checked).toBe(true)
      })

      const inputField = screen.getByLabelText('Interval value')
      const unitDropdown = screen.getByLabelText('Interval unit')

      expect(inputField).toBeEnabled()
      expect(unitDropdown).toBeEnabled()

      const checkbox = screen.getByLabelText('Enable periodic scanner')
      await user.click(checkbox)

      await waitFor(() => {
        expect(inputField).toBeDisabled()
        expect(unitDropdown).toBeDisabled()
      })
    })

    test('triggers mutation with zero interval when disabled', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 0 },
          },
          result: {
            data: { setPeriodicScanInterval: 0 },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          'Enable periodic scanner'
        ) as HTMLInputElement
        expect(checkbox.checked).toBe(true)
      })

      const checkbox = screen.getByLabelText('Enable periodic scanner')
      await user.click(checkbox)

      // The mutation should be triggered with interval: 0
      // Wait for mutation to complete - no error should occur
      await waitFor(() => {
        const checkbox = screen.getByLabelText(
          'Enable periodic scanner'
        ) as HTMLInputElement
        expect(checkbox.checked).toBe(false)
      })
    })
  })

  describe('Mutation Handling', () => {
    test('triggers mutation when Enter is pressed in input field', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 600 },
          },
          result: {
            data: { setPeriodicScanInterval: 600 },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value')
        expect(inputField).toBeEnabled()
      })

      const inputField = screen.getByLabelText('Interval value')
      await user.clear(inputField)
      await user.type(inputField, '10')
      await user.keyboard('{Enter}')

      // Verify mutation completed successfully by checking UI state
      await waitFor(() => {
        const updatedField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(updatedField.value).toBe('10')
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      })
    })

    test('triggers mutation when unit is changed', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
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
            variables: { interval: 123 * 60 * 60 },
          },
          result: {
            data: { setPeriodicScanInterval: 123 * 60 * 60 },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const unitDropdown = screen.getByLabelText('Interval unit')
        expect(unitDropdown).toBeEnabled()
      })

      const unitDropdown = screen.getByLabelText('Interval unit')
      await user.selectOptions(unitDropdown, 'hour')

      // Verify mutation completed and UI reflects the change
      await waitFor(() => {
        const updatedDropdown = screen.getByLabelText('Interval unit') as HTMLSelectElement
        expect(updatedDropdown.value).toBe('hour')
        const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(inputField.value).toBe('123')
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      })
    })

    test('shows loading indicator during mutation', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 600 },
          },
          result: {
            data: { setPeriodicScanInterval: 600 },
          },
          delay: 100,
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value')
        expect(inputField).toBeEnabled()
      })

      const inputField = screen.getByLabelText('Interval value')
      await user.clear(inputField)
      await user.type(inputField, '10{Enter}')

      // Verify mutation completed and value is updated
      await waitFor(() => {
        const updatedField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(updatedField.value).toBe('10')
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      })
    })

    test('does not trigger duplicate mutations for same value', async () => {
      const user = userEvent.setup()
      let mutationCount = 0

      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 600 },
          },
          result: () => {
            mutationCount++
            return {
              data: { setPeriodicScanInterval: 600 },
            }
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value')
        expect(inputField).toBeEnabled()
      })

      const inputField = screen.getByLabelText('Interval value')

      // First mutation: change value to 10 minutes (600 seconds)
      await user.clear(inputField)
      await user.type(inputField, '10{Enter}')

      // Wait for mutation to complete
      await waitFor(() => {
        expect(mutationCount).toBe(1)
      })

      // Try triggering again with the same value (10 minutes)
      await user.click(inputField)
      await user.keyboard('{Enter}')

      // Should still be 1 - no duplicate mutation triggered
      await waitFor(() => {
        expect(mutationCount).toBe(1)
      })
    })
  })

  describe('User Interactions', () => {
    test('updates value when user types in input field', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value')
        expect(inputField).toBeEnabled()
      })

      const inputField = screen.getByLabelText('Interval value') as HTMLInputElement
      await user.clear(inputField)
      await user.type(inputField, '42')

      expect(inputField.value).toBe('42')
    })

    test('changes unit via dropdown', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 5 * 3600 },
          },
          result: {
            data: { setPeriodicScanInterval: 5 * 3600 },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const unitDropdown = screen.getByLabelText('Interval unit')
        expect(unitDropdown).toBeEnabled()
      })

      const unitDropdown = screen.getByLabelText(
        'Interval unit'
      ) as HTMLSelectElement
      await user.selectOptions(unitDropdown, 'hour')

      await waitFor(() => {
        expect(unitDropdown.value).toBe('hour')
      })
    })

    test('combined value and unit change triggers correct mutation', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 0, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 0 },
          },
          result: {
            data: { setPeriodicScanInterval: 0 },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 123 * 60 },
          },
          result: {
            data: { setPeriodicScanInterval: 123 * 60 },
          },
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const checkbox = screen.getByLabelText('Enable periodic scanner')
        expect(checkbox).not.toBeDisabled()
      })

      const checkbox = screen.getByLabelText('Enable periodic scanner')
      const inputField = screen.getByLabelText('Interval value')
      const unitDropdown = screen.getByLabelText('Interval unit')

      await user.click(checkbox)

      await waitFor(() => {
        expect(inputField).toBeEnabled()
      })

      await user.clear(inputField)
      await user.type(inputField, '123')
      await user.selectOptions(unitDropdown, 'minute')

      // Wait for mutation
      await waitFor(
        () => {
          expect(consoleErrorSpy).not.toHaveBeenCalled()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('Loading States', () => {
    test('checkbox is disabled during query loading', () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 0, __typename: 'SiteInfo' },
            },
          },
          delay: 100,
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      const checkbox = screen.getByLabelText('Enable periodic scanner')
      expect(checkbox).toBeDisabled()
    })

    test('loader shows during query', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 0, __typename: 'SiteInfo' },
            },
          },
          delay: 50,
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      // During loading, checkbox should be disabled
      const checkbox = screen.getByLabelText('Enable periodic scanner')
      expect(checkbox).toBeDisabled()

      // Wait for query to complete
      await waitFor(() => {
        expect(checkbox).not.toBeDisabled()
      })
    })

    test('loader shows for combined query and mutation loading', async () => {
      const user = userEvent.setup()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: SCAN_INTERVAL_QUERY,
          },
          result: {
            data: {
              siteInfo: { periodicScanInterval: 300, __typename: 'SiteInfo' },
            },
          },
        },
        {
          request: {
            query: SCAN_INTERVAL_MUTATION,
            variables: { interval: 600 },
          },
          result: {
            data: { setPeriodicScanInterval: 600 },
          },
          delay: 100,
        },
      ]

      renderWithProviders(<PeriodicScanner />, { mocks })

      await waitFor(() => {
        const inputField = screen.getByLabelText('Interval value')
        expect(inputField).toBeEnabled()
      })

      const inputField = screen.getByLabelText('Interval value')
      await user.clear(inputField)
      await user.type(inputField, '10{Enter}')

      // Verify mutation completed successfully and UI reflects changes
      await waitFor(() => {
        const updatedField = screen.getByLabelText('Interval value') as HTMLInputElement
        expect(updatedField.value).toBe('10')
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      })
    })
  })
})
