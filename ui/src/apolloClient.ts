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

const MAX_RETRY_DELAY = 30_000
const MAX_RETRY_ATTEMPTS = 100

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
  const exponentialDelay = Math.min(MAX_RETRY_DELAY, BASE_DELAY * Math.pow(2, retries))
  const jitter = exponentialDelay * (0.5 + Math.random())
  return Math.min(jitter, MAX_RETRY_DELAY)
}

let retryAttemptCount = 0
let hasConnectedOnce = false
let isPageUnloading = false

/**
 * Decides whether a "closed" event is a benign/expected closure that
 * shouldn't be surfaced as a warning:
 * - deliberate, clean closures (code 1000) are never a problem, and
 * - a single transient closure before the connection has ever succeeded
 */
export const isLegitimateClose = (
  closeEvent: unknown,
  hasConnectedBefore: boolean,
  currentRetryAttemptCount: number
): boolean => {
  if (
    closeEvent &&
    typeof closeEvent === 'object' &&
    'code' in closeEvent &&
    ((closeEvent as CloseEvent).code === 1000 || (closeEvent as CloseEvent).code === 1001) &&
    (closeEvent as CloseEvent).wasClean
  ) {
    return true
  }

  return !hasConnectedBefore && currentRetryAttemptCount <= 1
}

const wsClient = createClient({
  url: websocketUri.toString(),
  retryAttempts: MAX_RETRY_ATTEMPTS,
  // Don't wait forever for the server's handshake reply. This bounds how
  // long we'll sit stuck on that single attempt before treating it as
  // failed and retrying
  connectionAckWaitTimeout: 10_000,
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
  shouldRetry: errOrCloseEvent => {
    if (isPageUnloading) return false

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
        return false
      }

      // Don't retry on forbidden errors (4403)
      if (closeEvent.code === 4403) {
        console.error('[WebSocket] Forbidden (4403), stopping retries')
        return false
      }

      // Don't retry on other client-side protocol/application errors (4400-4499 range, except transient ones)
      if (closeEvent.code >= 4400 && closeEvent.code < 4500) {
        console.error(`[WebSocket] Client error (${closeEvent.code}), stopping retries`)
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
        return false
      }
    }
    return true
  },
  // Control retry timing (exponential backoff with jitter)
  retryWait: async retries => {
    retryAttemptCount = retries + 1
    const delay = calculateRetryDelay(retries)

    if (!isPageUnloading && (hasConnectedOnce || retries > 0)) {
      console.info(
        `[WebSocket] Waiting ${Math.round(delay)}ms before retry ${retryAttemptCount}/${MAX_RETRY_ATTEMPTS}`
      )
    }

    // Return a Promise that resolves after the delay
    await new Promise(resolve => setTimeout(resolve, delay))
  },
  on: {
    connecting: () => {
      if (isPageUnloading) return
      console.info('[WebSocket] Connecting...')
    },
    error: error => {
      if (isPageUnloading || (!hasConnectedOnce && retryAttemptCount - 1 === 0)) return

      if (retryAttemptCount >= MAX_RETRY_ATTEMPTS) {
        console.error(`[WebSocket] Exhausted all ${MAX_RETRY_ATTEMPTS} retry attempts, giving up:`, error)
        // The error thrown by graphql-ws here has no GraphQL/server "result"
        // shape, so Apollo's linkError -> getServerErrorMessages() never
        // surfaces anything to the user for this case. Show an explicit
        // message so the app doesn't go silently dark.
        globalMessageHandler.add({
          key: 'websocket-retries-exhausted',
          type: NotificationType.Message,
          props: {
            negative: true,
            header: 'Live updates disconnected',
            content:
              'Could not reconnect to the server after multiple attempts. Please refresh the page once the server is back online.',
          },
        })
        return
      }
      console.warn(
        `[WebSocket] Connection attempt failed (after ${retryAttemptCount}/${MAX_RETRY_ATTEMPTS} retries so far):`,
        error
      )
    },
    closed: event => {
      if (isPageUnloading || isLegitimateClose(event, hasConnectedOnce, retryAttemptCount)) return

      if (event && typeof event === 'object' && 'code' in event) {
        const closeEvent = event as CloseEvent
        console.warn(
          `[WebSocket] Closed (code: ${closeEvent.code}, reason: "${closeEvent.reason || 'none'}", clean: ${closeEvent.wasClean})`
        )
      } else {
        console.warn('[WebSocket] Closed unexpectedly', event)
      }
    },
    connected: (_socket, _payload, wasRetry) => {
      hasConnectedOnce = true

      if (wasRetry) {
        console.info(`[WebSocket] Connection restored after ${retryAttemptCount} retry(ies)`)
      } else {
        console.info('[WebSocket] Connected')
      }
      retryAttemptCount = 0
    },
  },
})

// Say "goodbye" to the server the instant the page starts leaving (refresh,
// navigation, or tab close), instead of letting the browser force-close the
// socket and having our own code mistake that for a real outage.
if (globalThis.window !== undefined) {
  const teardownWsClient = () => {
    if (isPageUnloading) return
    isPageUnloading = true
    wsClient.dispose()
  }
  globalThis.window.addEventListener('beforeunload', teardownWsClient, { once: true })
  globalThis.window.addEventListener('pagehide', teardownWsClient, { once: true })
}

const wsLink = new GraphQLWsLink(wsClient)

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

/**
 * Determines whether a network error represents an authentication/authorization
 * failure (HTTP 401/403), as opposed to a transient/generic network problem
 * such as the backend restarting during a deployment.
 */
export function isAuthNetworkError(networkError: Error | undefined): boolean {
  if (!networkError) return false
  if ('statusCode' in networkError) {
    const statusCode = (networkError as ServerError).statusCode
    return statusCode === 401 || statusCode === 403
  }
  return false
}

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

    if (graphQLErrors.length === 1) {
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

    if (graphQLErrors.some(x => x.message === 'unauthorized')) {
      console.error('Unauthorized, clearing token cookie')
      clearTokenCookie()
      // location.reload()
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${JSON.stringify(networkError)}`)
    const isAuthError = isAuthNetworkError(networkError)
    if (isAuthError) {
      console.error('[Authentication failure (401/403)] Clearing token cookie')
      clearTokenCookie()
    }

    const errors = getServerErrorMessages(networkError);
    if (errors.length === 1) {
      errorMessages.push({
        header: isAuthError ? 'Server error' : 'Connection problem',
        content: isAuthError
          ? `You are being logged out in an attempt to recover.\n${errors[0].message}`
          : `A temporary connection problem occurred: ${errors[0].message}`,
      })
    } else if (errors.length > 1) {
      errorMessages.push({
        header: isAuthError ? 'Multiple server errors' : 'Multiple connection problems',
        content: `Received ${graphQLErrors?.length || 0} errors from the server.${isAuthError
          ? ' You are being logged out in an attempt to recover.'
          : ' Retrying automatically.'}`,
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

// Mirrors Apollo Client's internal KeySpecifier type (not publicly exported in v3)
type KeySpecifier = ReadonlyArray<string | KeySpecifier>
type PaginateCacheType = {
  keyArgs: KeySpecifier
  merge: FieldMergeFunction<unknown[], unknown[]>
}

// Modified version of Apollo's offsetLimitPagination()
export const paginateCache = (keyArgs: KeySpecifier) =>
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
      // Log a warning instead of throwing to avoid surfacing this as a user-visible error.
      console.warn(`[paginateCache] Paginate argument is missing for field: ${fieldName}. Preserving existing cache.`)
      // No paginate argument — this occurs when mutation responses (e.g.
      // moveImageFaces returning imageFaces { id }) write to a paginated field
      // without a pagination context. Preserve existing paginated data to avoid
      // overwriting the cache with incomplete mutation data.
      return existing ?? []
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
        imageFaces: paginateCache([['paginate', ['limit']]]),
      },
    },
    Query: {
      fields: {
        myTimeline: paginateCache(['onlyFavorites']),
        myFaceGroups: paginateCache([['paginate', ['limit']]]),
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
