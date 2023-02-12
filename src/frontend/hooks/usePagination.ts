import useInfiniteScroll from 'react-infinite-scroll-hook'
import { useState, useEffect, useCallback } from 'react'

// TODO: improvement suggestion: paginate in backend
export default function usePagination<T>(
  list: T[],
  { rpp, infinite }: { rpp: number; infinite?: boolean }
) {
  const loadPage = useCallback(
    (page: number) => {
      const offset = rpp * (page - 1)
      return list.slice(offset, offset + rpp)
    },
    [list]
  )

  const [paginatedList, setPaginatedList] = useState<T[]>(() => loadPage(1))
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
    setPaginatedList(loadPage(1))
  }, [list, loadPage])

  const hasMore = paginatedList.length !== list.length

  const loadMore = useCallback(() => {
    if (!hasMore) {
      return
    }

    setPage(page + 1)
    const newListPage = loadPage(page + 1)
    if (infinite) {
      setPaginatedList([...paginatedList, ...newListPage])
    } else {
      setPaginatedList(newListPage)
    }
  }, [hasMore, page, paginatedList, loadPage])

  const [sentryRef] = useInfiniteScroll({
    loading: false,
    hasNextPage: hasMore,
    onLoadMore: loadMore
  })

  return {
    loadMore: loadMore,
    page,
    paginatedList,
    hasMore,
    infiniteScrollSentryRef: sentryRef
  }
}
