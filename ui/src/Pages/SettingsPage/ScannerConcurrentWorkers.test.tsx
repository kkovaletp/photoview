import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders } from '../../helpers/testUtils'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GraphQLError } from 'graphql'
import type { MockedResponse } from '@apollo/client/testing'

import {
  CONCURRENT_WORKERS_QUERY,
  SET_CONCURRENT_WORKERS_MUTATION,
  ScannerConcurrentWorkers,
} from './ScannerConcurrentWorkers'
import type { concurrentWorkersQuery } from './__generated__/concurrentWorkersQuery'
import type {
  setConcurrentWorkers,
  setConcurrentWorkersVariables,
} from './__generated__/setConcurrentWorkers'

describe('ScannerConcurrentWorkers', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Query Loading', () => {
    test('should load data and enable input with correct value', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 8,
              },
            },
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = (
        await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })
      ) as HTMLInputElement
      await waitFor(() => {
        expect(input).not.toBeDisabled()
        expect(input.value).toBe('8')
      })
    })
  })

  describe('Error Handling', () => {
    test('should display error message when query fails with GraphQL error', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            errors: [new GraphQLError('Database connection failed')],
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load concurrent workers setting/i)
        ).toBeInTheDocument()
        expect(
          screen.getByText(/database connection failed/i)
        ).toBeInTheDocument()
      })
    })

    test('should display error message when query fails with network error', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          error: new Error('Network error'),
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load concurrent workers setting/i)
        ).toBeInTheDocument()
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    test('should log error to console when query fails', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            errors: [new GraphQLError('Test error')],
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load concurrent workers setting: ',
          expect.anything()
        )
      })
    })

    test('should hide input field when error occurs', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            errors: [new GraphQLError('Error')],
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      await waitFor(() => {
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
      })
    })

    test('should still display title when error occurs', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            errors: [new GraphQLError('Error')],
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      await waitFor(() => {
        expect(
          screen.getByText('Scanner concurrent workers')
        ).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    test('should update input value when user types', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', {
        name: /scanner concurrent workers/i,
      })

      fireEvent.change(input, { target: { value: '12' } })

      expect(input).toHaveValue(12)
    })

    test('should trigger mutation on blur with different value', async () => {
      const mutationSpy = vi.fn()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 10,
            },
          },
          result: () => {
            mutationSpy()
            return {
              data: { setScannerConcurrentWorkers: 10 }
            }
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })

      fireEvent.change(input, { target: { value: '10' } })
      fireEvent.blur(input)

      await waitFor(() => expect(mutationSpy).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(input).not.toBeDisabled())
    })

    test('should trigger mutation on Enter key press', async () => {
      const mutationSpy = vi.fn()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 6,
            },
          },
          result: () => {
            mutationSpy()
            return {
              data: { setScannerConcurrentWorkers: 6 }
            }
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })

      fireEvent.change(input, { target: { value: '6' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => expect(mutationSpy).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(input).not.toBeDisabled())
    })

    test('should respect min and max constraints', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = (
        await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })
      ) as HTMLInputElement

      expect(input).toHaveAttribute('min', '1')
      expect(input).toHaveAttribute('max', '24')
    })
  })

  describe('Mutation Handling', () => {
    test('should NOT trigger mutation when value is unchanged on blur', async () => {
      const user = userEvent.setup()
      const mutationMock = vi.fn()

      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 5,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 5,
            },
          },
          result: () => {
            mutationMock()
            return {
              data: {
                setScannerConcurrentWorkers: 5,
              },
            }
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })
      await waitFor(() => {
        expect(input).toHaveValue(5)
      })

      // Blur without changing value
      await user.click(input)
      await user.tab()

      await waitFor(() => {
        expect(mutationMock).not.toHaveBeenCalled()
      })
    })

    test('should NOT trigger mutation when value is unchanged on Enter', async () => {
      const user = userEvent.setup()
      const mutationMock = vi.fn()

      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 7,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 7,
            },
          },
          result: () => {
            mutationMock()
            return {
              data: {
                setScannerConcurrentWorkers: 7,
              },
            }
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })
      await waitFor(() => {
        expect(input).toHaveValue(7)
      })

      // Press Enter without changing value
      await user.click(input)
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mutationMock).not.toHaveBeenCalled()
      })
    })

    test('should successfully execute mutation with correct variables', async () => {
      const mutationSpy = vi.fn()
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 2,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 16,
            },
          },
          result: () => {
            mutationSpy()
            return {
              data: { setScannerConcurrentWorkers: 16 }
            }
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })

      fireEvent.change(input, { target: { value: '16' } })
      fireEvent.blur(input)

      await waitFor(() => expect(mutationSpy).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(input).not.toBeDisabled())
    })

    test('should NOT trigger duplicate mutations for same value', async () => {
      const user = userEvent.setup()
      const mutationMock = vi.fn()

      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 3,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 9,
            },
          },
          result: () => {
            mutationMock()
            return {
              data: {
                setScannerConcurrentWorkers: 9,
              },
            }
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })

      // Change to 9 and blur
      fireEvent.change(input, { target: { value: '9' } })
      fireEvent.blur(input)

      await waitFor(() => {
        expect(mutationMock).toHaveBeenCalledTimes(1)
      })

      // Try to trigger again with same value
      await user.click(input)
      await user.keyboard('{Enter}')

      // Should still be called only once
      await waitFor(() => {
        expect(mutationMock).toHaveBeenCalledTimes(1)
      })
    })

    test.each([1, 12, 24])('should handle mutation with worker count %i', async (count) => {

      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: count,
            },
          },
          result: {
            data: {
              setScannerConcurrentWorkers: count,
            },
          },
        },
      ]

      const { unmount } = renderWithProviders(<ScannerConcurrentWorkers />, {
        mocks,
      })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })

      fireEvent.change(input, { target: { value: count.toString() } })
      fireEvent.blur(input)

      await waitFor(() => expect(input).not.toBeDisabled())

      unmount()
    })

    test('should handle mutation GraphQL error and re-enable input', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 11,
            },
          },
          result: {
            errors: [new GraphQLError('Mutation failed')],
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', {
        name: /scanner concurrent workers/i,
      })

      fireEvent.change(input, { target: { value: '11' } })
      fireEvent.blur(input)

      // Input should re-enable after mutation error
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('4')
      })
    })

    test('should handle mutation network error and re-enable input', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 13,
            },
          },
          error: new Error('Network error'),
        },
      ]

      const onError = vi.fn()

      renderWithProviders(<ScannerConcurrentWorkers />, {
        mocks,
        apolloOptions: {
          defaultOptions: {
            mutate: {
              errorPolicy: 'all',
              onError,
            },
          },
        },
      })

      const input = await screen.findByRole('spinbutton', {
        name: /scanner concurrent workers/i,
      })

      fireEvent.change(input, { target: { value: '13' } })
      fireEvent.blur(input)

      // Input should re-enable after network error
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })

      // Rolls back to last confirmed server value (4)
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('4')
      })
    })

    test('should handle non-numeric input by falling back to current value', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 6,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 6,
            },
          },
          result: {
            data: {
              setScannerConcurrentWorkers: 6,
            },
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', {
        name: /scanner concurrent workers/i,
      })

      // Wait for initial value to load
      await waitFor(() => {
        expect(input).toHaveValue(6)
      })

      // Type non-numeric characters
      fireEvent.change(input, { target: { value: 'abc' } })

      // The input will show 'abc' temporarily
      expect((input as HTMLInputElement).value).toBe('abc')

      // Trigger commit via blur
      fireEvent.blur(input)

      // Should fall back to current workerAmount (6) due to NaN handling
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('6')
      })
    })

    test('should handle server returning different value than requested', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 10,
            },
          },
          result: {
            data: {
              // Server returns 8 instead of requested 10 (e.g., due to server-side clamping)
              setScannerConcurrentWorkers: 8,
            },
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', {
        name: /scanner concurrent workers/i,
      })

      // Change to 10
      fireEvent.change(input, { target: { value: '10' } })
      fireEvent.blur(input)

      // Should update to server's returned value (8), not the requested value (10)
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('8')
      })
    })
  })

  describe('Loading States', () => {
    test('should disable input during query loading', () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
          delay: 100,
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = screen.getByRole('spinbutton', { name: /scanner concurrent workers/i })
      expect(input).toBeDisabled()
    })

    test('should disable input during mutation loading', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 8,
            },
          },
          result: {
            data: {
              setScannerConcurrentWorkers: 8,
            },
          },
          delay: 100,
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })

      fireEvent.change(input, { target: { value: '8' } })
      fireEvent.blur(input)

      // Input should be disabled during mutation
      await waitFor(() => {
        expect(input).toBeDisabled()
      })

      // Input should be enabled after mutation completes
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })
    })

    test('should handle combined loading states (query + mutation)', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 5,
              },
            },
          },
          delay: 50,
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: {
              workers: 15,
            },
          },
          result: {
            data: {
              setScannerConcurrentWorkers: 15,
            },
          },
          delay: 50,
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      // Initially disabled during query
      const input = screen.getByRole('spinbutton', { name: /scanner concurrent workers/i })
      expect(input).toBeDisabled()

      // Wait for query to complete
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })

      // Trigger mutation
      fireEvent.change(input, { target: { value: '15' } })
      fireEvent.blur(input)

      // Should be disabled during mutation
      await waitFor(() => {
        expect(input).toBeDisabled()
      })

      // Should be enabled after mutation
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })
    })
  })

  describe('Component Rendering', () => {
    test('should render title and description', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      expect(
        screen.getByText('Scanner concurrent workers')
      ).toBeInTheDocument()

      await waitFor(() => {
        expect(
          screen.getByText(
            /the maximum amount of scanner jobs that is allowed to run at once/i
          )
        ).toBeInTheDocument()
      })
    })

    test('should render input with correct type', async () => {
      const mocks: MockedResponse[] = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                __typename: 'SiteInfo',
                concurrentWorkers: 4,
              },
            },
          },
        },
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      const input = await screen.findByRole('spinbutton', { name: /scanner concurrent workers/i })
      expect(input).toHaveAttribute('type', 'number')
    })
  })

  describe('In-flight Request Deduplication', () => {
    test('prevents duplicate mutations for same value while one is in flight', async () => {
      let mutationCallCount = 0

      const mocks = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: { workers: 8 },
          },
          result: () => {
            mutationCallCount++
            return {
              data: {
                setScannerConcurrentWorkers: 8,
              },
            }
          },
          delay: 100, // Simulate slow network to ensure we can trigger blur multiple times
        },
      ]

      const { getByLabelText } = renderWithProviders(
        <ScannerConcurrentWorkers />,
        { mocks }
      )

      // Wait for initial query to complete
      const input = await waitFor(() => {
        const el = getByLabelText(/scanner concurrent workers/i) as HTMLInputElement
        expect(el).not.toBeDisabled()
        expect(el.value).toBe('4')
        return el
      })

      // Type new value
      fireEvent.change(input, { target: { value: '8' } })

      // Wait for DOM to reflect the change BEFORE triggering blur
      await waitFor(() => {
        expect(input.value).toBe('8')
      })

      // Trigger blur multiple times rapidly (simulating race condition)
      fireEvent.blur(input)
      fireEvent.blur(input)

      // Also trigger Enter key
      fireEvent.keyDown(input, { key: 'Enter' })

      // Verify mutation was called exactly once despite multiple triggers after mutation is complete
      await waitFor(() => {
        expect(mutationCallCount).toBe(1)
      }, { timeout: 1000 })
    })

    test('allows new mutation after previous completes', async () => {
      let mutationCallCount = 0

      const mocks = [
        {
          request: {
            query: CONCURRENT_WORKERS_QUERY,
          },
          result: {
            data: {
              siteInfo: {
                concurrentWorkers: 4,
              },
            },
          },
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: { workers: 8 },
          },
          result: () => {
            mutationCallCount++
            return {
              data: {
                setScannerConcurrentWorkers: 8,
              },
            }
          },
          delay: 50,
        },
        {
          request: {
            query: SET_CONCURRENT_WORKERS_MUTATION,
            variables: { workers: 10 },
          },
          result: () => {
            mutationCallCount++
            return {
              data: {
                setScannerConcurrentWorkers: 10,
              },
            }
          },
        },
      ]

      const { getByLabelText } = renderWithProviders(
        <ScannerConcurrentWorkers />,
        { mocks }
      )

      await waitFor(() => {
        expect(getByLabelText(/scanner concurrent workers/i)).not.toBeDisabled()
      })

      const input = await waitFor(() => {
        const el = getByLabelText(/scanner concurrent workers/i) as HTMLInputElement
        expect(el).not.toBeDisabled()
        expect(el.value).toBe('4')
        return el
      })

      // First mutation
      fireEvent.change(input, { target: { value: '8' } })

      // Wait for DOM update before blur
      await waitFor(() => {
        expect(input.value).toBe('8')
      })
      fireEvent.blur(input)

      // Wait for first mutation to complete
      await waitFor(() => {
        expect(mutationCallCount).toBe(1)
      }, { timeout: 500 })

      // Second mutation (should be allowed after first completes)
      fireEvent.change(input, { target: { value: '10' } })

      // Wait for DOM update before blur
      await waitFor(() => {
        expect(input.value).toBe('10')
      })
      fireEvent.blur(input)

      // Wait for second mutation to complete
      await waitFor(() => {
        expect(mutationCallCount).toBe(2)
      }, { timeout: 500 })
    })
  })
})
