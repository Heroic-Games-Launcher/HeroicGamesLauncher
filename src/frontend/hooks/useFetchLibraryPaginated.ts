import useGlobalStore from './useGlobalStore'
import { useLocalObservable } from 'mobx-react'
import { Box } from '../state/new/utils'
import { Pagination } from './types'
import { GameInfo } from '../../common/types'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

export default function useFetchLibraryPaginated({
  termBox,
  isFavourite,
  rpp
}: {
  termBox?: Box<string>
  isFavourite?: boolean
  rpp: number
}): Pagination<GameInfo> {
  const { libraryGames } = useGlobalStore()

  return useLocalObservable(() => {
    return {
      page: 1,
      rpp,
      get list() {
        const regex = new RegExp(fixFilter(this.term || ''), 'i')
        return libraryGames
          .slice(0, this.page * rpp)
          .filter((i) => regex.test(i.title))
      },
      get hasMore() {
        return libraryGames.length !== this.list.length
      },
      get term() {
        return termBox ? termBox.get() : ''
      },
      loadMore() {
        if (this.hasMore) {
          this.page++
        }
      }
    }
  })
}
