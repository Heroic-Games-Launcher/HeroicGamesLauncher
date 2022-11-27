import useGlobalStore from './useGlobalStore'
import { useLocalObservable } from 'mobx-react'
import { Box } from '../state/new/utils'
import { Pagination } from './types'
import { Category } from '../types'
import { runInAction } from 'mobx'
import { Game } from '../state/new/Game'
import { GameInfo } from '../../common/types'

function fixFilter(text: string) {
  const regex = new RegExp(/([?\\|*|+|(|)|[|]|])+/, 'g')
  return text.replaceAll(regex, '')
}

const filterByPlatform = ({
  category,
  platform,
  game,
  currentPlatform
}: {
  category?: Category
  platform: string
  game: GameInfo
  currentPlatform?: string
}) => {
  // Epic doesn't offer Linux games, so just default to showing all games there
  if (category === 'legendary' && platform === 'linux') {
    return true
  }

  const isMac = ['osx', 'Mac']

  switch (platform) {
    case 'win':
      return game?.is_installed
        ? game?.install?.platform?.toLowerCase() === 'windows'
        : currentPlatform === 'darwin'
        ? !game?.is_mac_native
        : !game?.is_linux_native
    case 'mac':
      return game?.is_installed
        ? isMac.includes(game?.install?.platform ?? '')
        : game?.is_mac_native
    case 'linux':
      return game?.is_installed
        ? game?.install?.platform === 'linux'
        : game?.is_linux_native
    default:
      return true
  }
}

export default function useFetchLibraryPaginated({
  termBox,
  onlyFavourites,
  sortBox,
  categoryBox,
  platformBox,
  showHiddenBox,
  onlyRecent,
  rpp
}: {
  termBox?: Box<string>
  sortBox?: Box<'descending' | 'installed'>
  platformBox?: Box<string>
  categoryBox?: Box<Category>
  showHiddenBox?: Box<boolean>
  onlyFavourites?: boolean
  onlyRecent?: boolean
  rpp: number
}): Pagination<Game> {
  const globalStore = useGlobalStore()

  return useLocalObservable(() => {
    return {
      page: 1,
      rpp,
      refreshing: false as boolean,
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
          if (onlyRecent && !i.isRecent) {
            return false
          }
          if (onlyFavourites && !i.isFavourite) {
            return false
          }
          if (!showHiddenBox?.get() && i.isHidden) {
            return false
          }
          if (
            platformBox?.get() &&
            !filterByPlatform({
              platform: platformBox.get(),
              game: i.data,
              category: categoryBox?.get(),
              currentPlatform: globalStore.platform
            })
          ) {
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
        const installed = filtered.filter((g) => g.isInstalled)
        const notInstalled = filtered.filter(
          (g) => !g.isInstalled
          // && !installing.includes(g.app_name)
        )
        // const installingGames = library.filter(
        //   (g) => !g.is_installed && installing.includes(g.app_name)
        // )
        return this.sortInstalled ? [...installed, ...notInstalled] : library
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
    }
  })
}
