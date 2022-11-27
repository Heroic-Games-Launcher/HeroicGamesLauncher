export type Pagination<T> = {
  list: T[]
  page: number
  rpp: number
  hasMore: boolean
  loadMore(): void
}
