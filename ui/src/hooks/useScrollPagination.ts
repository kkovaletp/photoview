import { ApolloQueryResult } from '@apollo/client'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ScrollPaginationArgs<D> {
  loading: boolean
  data: D | undefined
  fetchMore: (args: {
    variables: { offset: number }
  }) => Promise<ApolloQueryResult<D>>
  getItems: (data: D) => unknown[]
  pageSize?: number
  rootMargin?: string
  threshold?: number
}

type ScrollPaginationResult = {
  finished: boolean
  loadingMore: boolean
  containerElem: (node: null | Element) => void
  scrollRootElem: (node: null | Element) => void
}

const useScrollPagination = <D>({
  loading,
  fetchMore,
  data,
  getItems,
  pageSize,
  rootMargin = '-100% 0px 0px 0px',
  threshold = 0,
}: ScrollPaginationArgs<D>): ScrollPaginationResult => {
  const observer = useRef<IntersectionObserver | null>(null)
  const observerElem = useRef<Element | null>(null)
  const observerRootElem = useRef<Element | null>(null)

  const [loadingMore, setLoadingMore] = useState(false)
  const [finished, setFinished] = useState(false)

  const loadedItemCount = data === undefined ? undefined : getItems(data).length

  const paginationFinished =
    data !== undefined &&
    (finished ||
      loadedItemCount === 0 ||
      (pageSize !== undefined &&
        loadedItemCount !== undefined &&
        loadedItemCount < pageSize))

  const reconfigureIntersectionObserver = useCallback(() => {
    const options = {
      root: observerRootElem.current,
      rootMargin,
      threshold,
    }

    observer.current?.disconnect()
    observer.current = null

    if (paginationFinished) return

    observer.current = new IntersectionObserver(entities => {
      if (!entities.some(x => x.isIntersecting) || loadingMore) return

      const itemCount = data === undefined ? 0 : getItems(data).length

      setLoadingMore(true)

      fetchMore({
        variables: {
          offset: itemCount,
        },
      }).then(result => {
        const newItemCount = getItems(result.data).length

        if (
          newItemCount === 0 ||
          (pageSize !== undefined && newItemCount < pageSize)
        ) {
          setFinished(true)
        }
      }).catch(error => {
        console.error('Failed to load more items:', error)
      }).finally(() => {
        setLoadingMore(false)
      })
    }, options)

    if (observerElem.current && !loading && !loadingMore) {
      observer.current.observe(observerElem.current)
    }
  }, [
    loading,
    loadingMore,
    fetchMore,
    data,
    getItems,
    pageSize,
    paginationFinished,
    rootMargin,
    threshold,
  ])

  const containerElem = useCallback(
    (node: null | Element): void => {
      observerElem.current = node

      if (observer.current != null) {
        observer.current.disconnect()
      }

      if (node != null) {
        reconfigureIntersectionObserver()
      }
    },
    [reconfigureIntersectionObserver]
  )

  const scrollRootElem = useCallback(
    (node: null | Element): void => {
      observerRootElem.current = node

      if (observer.current != null) {
        observer.current.disconnect()
      }

      reconfigureIntersectionObserver()
    },
    [reconfigureIntersectionObserver]
  )

  useEffect(() => {
    if (!observer.current || !observerElem.current) return

    if (loading || loadingMore || paginationFinished) {
      observer.current.unobserve(observerElem.current)
    } else {
      observer.current.observe(observerElem.current)
    }
  }, [loading, loadingMore, paginationFinished])

  useEffect(() => {
    reconfigureIntersectionObserver()
  }, [reconfigureIntersectionObserver])

  useEffect(() => {
    if (loading && !loadingMore) {
      setFinished(false)
    }
  }, [loading, loadingMore])

  return {
    containerElem,
    scrollRootElem,
    finished: paginationFinished,
    loadingMore,
  }
}

export default useScrollPagination
