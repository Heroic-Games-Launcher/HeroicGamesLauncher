import useGlobalStore from './useGlobalStore'
import { useLocalObservable } from 'mobx-react'
import { Box } from '../state/new/utils'
import { Pagination } from './types'
import { Category } from '../types'
import { runInAction } from 'mobx'
import { Game } from '../state/new/Game'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

export default function useFetchLibraryPaginated({
  termBox,
  onlyFavourites,
  sortBox,
  categoryBox,
  showHiddenBox,
  rpp
}: {
  termBox?: Box<string>
  sortBox?: Box<'descending' | 'installed'>
  categoryBox?: Box<Category>
  showHiddenBox?: Box<boolean>
  onlyFavourites?: boolean
  rpp: number
}): Pagination<Game> {
  const globalStore = useGlobalStore()

  return useLocalObservable(() => {
    return {
      page: 1,
      rpp,
      refreshing: false,
      get sortDescending() {
        if (!sortBox) return false
        return sortBox.get() === 'descending'
      },
      get sortInstalled() {
        if (!sortBox) return false
        return sortBox.get() === 'installed'
      },
      get list() {
        return this.allResults.slice(0, this.page * rpp + 1)
      },
      get totalCount() {
        return this.allResults.length
      },
      get allResults() {
        const regex = new RegExp(fixFilter(this.term || ''), 'i')
        const filtered = globalStore.libraryGames.filter((i) => {
          if (onlyFavourites && !i.isFavourite) {
            return false
          }
          if (!showHiddenBox?.get() && i.isHidden) {
            return false
          }
          return regex.test(i.data.title)
        })

        // sort
        const library = filtered.sort((a, b) => {
          const gameA = a.data.title.toUpperCase().replace('THE ', '')
          const gameB = b.data.title.toUpperCase().replace('THE ', '')
          return this.sortDescending
            ? gameA > gameB
              ? -1
              : 1
            : gameA < gameB
            ? -1
            : 1
        })
        const installed = library.filter((g) => g.data.is_installed)
        // const notInstalled = library.filter(
        //   (g) => !g.is_installed && !installing.includes(g.app_name)
        // )
        // const installingGames = library.filter(
        //   (g) => !g.is_installed && installing.includes(g.app_name)
        // )
        return this.sortInstalled ? filtered : library
      },
      get hasMore() {
        return globalStore.libraryGames.length !== this.list.length
      },
      get term() {
        return termBox ? termBox.get() : ''
      },
      async refresh() {
        this.refreshing = true
        setTimeout(() => {
          runInAction(() => {
            this.refreshing = false
          })
        }, 1000)
      },
      loadMore() {
        if (this.hasMore) {
          this.page++
        }
      }
    } as Pagination<Game> & { [key: string]: any }
  })
}
