import {
  InMemoryCache,
  ApolloClient,
  split,
  ApolloLink,
  HttpLink,
  ServerError,
  FieldMergeFunction,
  Reference,
} from '@apollo/client'
import { getMainDefinition } from '@apollo/client/utilities'
import { onError } from '@apollo/client/link/error'

import urlJoin from 'url-join'
import { authToken, clearTokenCookie } from './helpers/authentication'
import { globalMessageHandler } from './components/messages/globalMessageHandler'
import { Message } from './components/messages/SubscriptionsHook'
import { NotificationType } from './__generated__/globalTypes'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'

export const API_ENDPOINT = import.meta.env.REACT_APP_API_ENDPOINT
  ? (import.meta.env.REACT_APP_API_ENDPOINT as string)
  : urlJoin(location.origin, '/api')

export const GRAPHQL_ENDPOINT = urlJoin(API_ENDPOINT, '/graphql')

type CachedItem = Reference | {
  id: string
  __typename: string
  [key: string]: unknown
}

// Track retry state outside the client creation
let retryCount = 0
const MAX_RETRIES = 5

const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
  credentials: 'include',
})

const apiProtocol = new URL(GRAPHQL_ENDPOINT).protocol

const websocketUri = new URL(GRAPHQL_ENDPOINT)
websocketUri.protocol = apiProtocol === 'https:' ? 'wss:' : 'ws:'

/**
 * Calculates retry delay with exponential backoff and jitter.
 * Pure function - no side effects.
 */
export const calculateRetryDelay = (retries: number): number => {
  const BASE_DELAY = 1000
  const MAX_DELAY = 30000
  const exponentialDelay = Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, retries))
  const jitter = exponentialDelay * (0.5 + Math.random())
  return Math.min(jitter, MAX_DELAY)
}

const wsLink = new GraphQLWsLink(
  createClient({
    url: websocketUri.toString(),
    connectionParams: () => {
      const token = authToken()
      // Only include authorization if token exists
      if (token) {
        return {
          Authorization: `Bearer ${token}`,
        }
      }
      return {}
    },
    shouldRetry: (errOrCloseEvent) => {
      // Check if we've exceeded max retries
      if (retryCount >= MAX_RETRIES) {
        console.error('[WebSocket] Max retries reached, stopping reconnection attempts')
        retryCount = 0 // Reset for future manual reconnects
        return false
      }

      // Type guard for CloseEvent
      if (
        errOrCloseEvent &&
        typeof errOrCloseEvent === 'object' &&
        'code' in errOrCloseEvent
      ) {
        const closeEvent = errOrCloseEvent as CloseEvent

        // Don't retry on authentication errors (4401)
        if (closeEvent.code === 4401) {
          console.error('[WebSocket] Unauthorized (4401), clearing token')
          clearTokenCookie()
          retryCount = 0
          return false
        }

        // Don't retry on forbidden errors (4403)
        if (closeEvent.code === 4403) {
          console.error('[WebSocket] Forbidden (4403), stopping retries')
          retryCount = 0
          return false
        }

        // Don't retry on client errors (4400-4499 range, except transient ones)
        if (closeEvent.code >= 4400 && closeEvent.code < 4500) {
          console.error(`[WebSocket] Client error (${closeEvent.code}), stopping retries`)
          retryCount = 0
          return false
        }
      }

      // Type guard for Error objects
      if (errOrCloseEvent instanceof Error) {
        const errorMessage = errOrCloseEvent.message.toLowerCase()

        // Don't retry on authentication errors
        if (
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('invalid authorization token') ||
          errorMessage.includes('authentication failed')
        ) {
          console.error('[WebSocket] Authentication error from server, clearing token')
          clearTokenCookie()
          retryCount = 0
          return false
        }
      }

      // Allow retry for transient errors
      retryCount++
      return true
    },
    // Control retry timing (exponential backoff with jitter)
    retryWait: async (retries) => {
      const delay = calculateRetryDelay(retries)

      console.log(
        `[WebSocket] Waiting ${Math.round(delay)}ms before retry ${retries + 1}/${MAX_RETRIES}`
      )

      // Return a Promise that resolves after the delay
      await new Promise(resolve => setTimeout(resolve, delay))
    },
    on: {
      error: (error) => {
        console.error('[WebSocket error]: ', error)
      },
      connected: () => {
        // Reset retry count on successful connection
        retryCount = 0
      },
    },
  })
)

const link = split(
  // split based on the operation type
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  },
  wsLink,
  httpLink
)

/**
 * Extracts an array of server error objects from a network error if available.
 *
 * @param networkError - The network error potentially containing server error details.
 * @returns An array of error objects from the server, or an empty array if none are found.
 */
export function getServerErrorMessages(networkError: Error | undefined): Error[] {
  if (!networkError) return [];
  if (!('result' in networkError)) return [];

  const serverError = networkError as ServerError;
  if (!serverError.result) return [];

  if (typeof serverError.result === 'object' && 'errors' in serverError.result) {
    return serverError.result.errors as Error[];
  }

  return [];
}

/**
 * Formats GraphQL path for error messages.
 */
export const formatPath = (path: readonly (string | number)[] | undefined): string =>
  path?.join('::') ?? 'undefined'

const linkError = onError(({ graphQLErrors, networkError }) => {
  const errorMessages = []

  if (graphQLErrors) {
    graphQLErrors.map(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(
          locations
        )} Path: ${formatPath(path)}`
      )
    )

    if (graphQLErrors.length == 1) {
      errorMessages.push({
        header: 'Something went wrong',
        content: `Server error: ${graphQLErrors[0].message} at (${formatPath(
          graphQLErrors[0].path
        )})`,
      })
    } else if (graphQLErrors.length > 1) {
      errorMessages.push({
        header: 'Multiple things went wrong',
        content: `Received ${graphQLErrors.length} errors from the server. See the console for more information`,
      })
    }

    if (graphQLErrors.find(x => x.message == 'unauthorized')) {
      console.error('Unauthorized, clearing token cookie')
      clearTokenCookie()
      // location.reload()
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${JSON.stringify(networkError)}`)
    clearTokenCookie()

    const errors = getServerErrorMessages(networkError);
    if (errors.length == 1) {
      errorMessages.push({
        header: 'Server error',
        content: `You are being logged out in an attempt to recover.\n${errors[0].message}`,
      })
    } else if (errors.length > 1) {
      errorMessages.push({
        header: 'Multiple server errors',
        content: `Received ${graphQLErrors?.length
          || 0} errors from the server. You are being logged out in an attempt to recover.`,
      })
    }
  }

  if (errorMessages.length > 0) {
    const newMessages: Message[] = errorMessages.map(msg => ({
      key: Math.random().toString(26),
      type: NotificationType.Message,
      props: {
        negative: true,
        ...msg,
      },
    }))

    // Use the global handler instead of useMessageState
    newMessages.forEach(message => globalMessageHandler.add(message))
  }
})

type PaginateCacheType = {
  keyArgs: string[]
  merge: FieldMergeFunction<unknown[], unknown[]>
}

// Modified version of Apollo's offsetLimitPagination()
export const paginateCache = (keyArgs: string[]) =>
({
  keyArgs,
  merge(existing, incoming, { args, fieldName }) {
    if (args?.paginate) {
      const { offset = 0 } = args.paginate as { offset: number }

      // If offset is 0, start fresh (initial query or refresh)
      if (offset === 0) {
        return [...incoming]
      }

      // For subsequent pages, merge while avoiding duplicates
      const existingItems = existing ? existing.slice(0) : []
      const existingIds = new Set(
        existingItems
          .filter(item => item != null)
          .map((item) => {
            const cachedItem = item as CachedItem
            if (typeof cachedItem !== 'object' || cachedItem === null) {
              return null
            }
            return '__ref' in cachedItem ? cachedItem.__ref : cachedItem.id
          }).filter(Boolean)
      )

      // Only add items that don't already exist
      const newItems = incoming
        .filter(item => item != null)
        .filter((item) => {
          const cachedItem = item as CachedItem
          if (typeof cachedItem !== 'object' || cachedItem === null) {
            return true // Include primitive values as they can't be deduplicated
          }
          const itemId = '__ref' in cachedItem ? cachedItem.__ref : cachedItem.id
          return itemId ? !existingIds.has(itemId) : true
        })

      return [...existingItems.filter(item => item != null), ...newItems]
    } else {
      throw new Error(`Paginate argument is missing for query: ${fieldName}`)
    }
  },
} as PaginateCacheType)

const memoryCache = new InMemoryCache({
  typePolicies: {
    // There only exists one global instance of SiteInfo,
    // therefore, it can always be merged
    SiteInfo: {
      merge: true,
    },
    MediaURL: {
      keyFields: ['url'],
    },
    Album: {
      fields: {
        media: paginateCache(['onlyFavorites', 'order']),
      },
    },
    FaceGroup: {
      fields: {
        imageFaces: paginateCache([]),
      },
    },
    Query: {
      fields: {
        myTimeline: paginateCache(['onlyFavorites']),
        myFaceGroups: paginateCache([]),
      },
    },
  },
})

const client = new ApolloClient({
  // link: ApolloLink.from([linkError, authLink.concat(link)]),
  link: ApolloLink.from([linkError, link]),
  cache: memoryCache,
})

export default client
