import LibraryPagination, {
  LibraryPaginationOptions
} from '../state/new/fetch-data/LibraryPagination'
import { useMemo } from 'react'
import useGlobalStore from './useGlobalStore'

export default function useFetchLibraryPaginated(
  options: LibraryPaginationOptions
): LibraryPagination {
  const globalStore = useGlobalStore()
  return useMemo(
    () => new LibraryPagination({ ...options, globalStore }),
    [globalStore]
  )
}
