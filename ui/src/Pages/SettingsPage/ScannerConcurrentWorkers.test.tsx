import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderWithProviders } from '../../helpers/testUtils'
import { screen, waitFor } from '@testing-library/react'
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
    test('should load and display concurrent workers value', async () => {
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

    test('should enable input after data loads', async () => {
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
      ]

      renderWithProviders(<ScannerConcurrentWorkers />, { mocks })

      await waitFor(() => {
        const input = screen.getByRole('spinbutton', { name: /scanner concurrent workers/i })
        expect(input).not.toBeDisabled()
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
      const user = userEvent.setup()
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

      await user.clear(input)
      await user.type(input, '12')

      expect(input).toHaveValue(12)
    })

    test('should trigger mutation on blur with different value', async () => {
      const user = userEvent.setup()
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

      await user.clear(input)
      await user.type(input, '10')
      await user.tab()

      await waitFor(() => expect(mutationSpy).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(input).not.toBeDisabled())
    })

    test('should trigger mutation on Enter key press', async () => {
      const user = userEvent.setup()
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

      await user.clear(input)
      await user.type(input, '6')
      await user.keyboard('{Enter}')

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
      const user = userEvent.setup()
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

      await user.clear(input)
      await user.type(input, '16')
      await user.tab()

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
      await user.clear(input)
      await user.type(input, '9')
      await user.tab()

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
      const user = userEvent.setup()

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

      await user.clear(input)
      await user.type(input, count.toString())
      await user.tab()

      await waitFor(() => expect(input).not.toBeDisabled())

      unmount()
    })

    test('should handle mutation GraphQL error and re-enable input', async () => {
      const user = userEvent.setup()
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

      await user.clear(input)
      await user.type(input, '11')
      await user.tab()

      // Input should re-enable after mutation error
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })
    })

    test('should handle mutation network error and re-enable input', async () => {
      const user = userEvent.setup()

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

      await user.clear(input)
      await user.type(input, '13')
      await user.tab()

      // Input should re-enable after network error
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })

      // Rolls back to last confirmed server value (4)
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('4')
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
      const user = userEvent.setup()
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

      await user.clear(input)
      await user.type(input, '8')
      await user.tab()

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
      const user = userEvent.setup()
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
      await user.clear(input)
      await user.type(input, '15')
      await user.tab()

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
})
