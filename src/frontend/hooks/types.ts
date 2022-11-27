export type Pagination<T> = {
  list: T[]
  page: number
  rpp: number
  hasMore: boolean
  refreshing: boolean
  loadMore(): void
  totalCount: number
  refresh(): void
}
