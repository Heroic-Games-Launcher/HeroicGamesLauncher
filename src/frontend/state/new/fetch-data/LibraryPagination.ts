import { Category } from '../../../types'
import { GameInfo } from '../../../../common/types'
import { Box } from '../common/utils'
import { makeAutoObservable, runInAction } from 'mobx'
import { SortGame } from '../common/common'
import { GlobalStore } from '../global/GlobalStore'

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

export type LibraryPaginationOptions = {
  globalStore: GlobalStore
  termBox?: Box<string>
  sortBox?: Box<SortGame>
  platformBox?: Box<string>
  categoryBox?: Box<Category>
  showHiddenBox?: Box<boolean>
  onlyFavourites?: boolean
  onlyRecent?: boolean
  rpp: number
}

export default class LibraryPagination {
  page = 1

  refreshing = false

  constructor(private options: LibraryPaginationOptions) {
    makeAutoObservable(this)
  }

  private get globalStore() {
    return this.options.globalStore
  }

  get sortDescending() {
    if (!this.options.sortBox) return false
    return this.options.sortBox.is('descending')
  }

  get sortInstalled() {
    if (!this.options.sortBox) return false
    return this.options.sortBox.is('installed')
  }

  get list() {
    return this.allResults.slice(0, this.page * this.options.rpp + 1)
  }

  get totalCount() {
    return this.allResults.length
  }

  get allResults() {
    const regex = new RegExp(fixFilter(this.term || ''), 'i')
    const filtered = this.options.globalStore.libraryGames.filter((i) => {
      if (
        this.options.categoryBox &&
        !this.options.categoryBox.is('all') &&
        !this.options.categoryBox.is(i.data.runner)
      ) {
        return false
      }
      if (this.options.onlyRecent && !i.isRecent) {
        return false
      }
      if (this.options.onlyFavourites && !i.isFavourite) {
        return false
      }
      if (!this.options.showHiddenBox?.get() && i.isHidden) {
        return false
      }
      if (
        this.options.platformBox?.get() &&
        !filterByPlatform({
          platform: this.options.platformBox.get(),
          game: i.data,
          category: this.options.categoryBox?.get(),
          currentPlatform: this.globalStore.platform
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
      (g) => !g.isInstalled && !g.isInstalling
    )
    const installingGames = library.filter(
      (g) => !g.isInstalled && g.isInstalling
    )
    return this.sortInstalled
      ? [...installingGames, ...installed, ...notInstalled]
      : library
  }

  get hasMore() {
    return this.globalStore.libraryGames.length !== this.list.length
  }

  get term() {
    return this.options.termBox ? this.options.termBox.get() : ''
  }

  async refresh() {
    this.refreshing = true
    setTimeout(() => {
      runInAction(() => {
        this.refreshing = false
      })
    }, 1000)
  }

  loadMore() {
    if (this.hasMore) {
      this.page++
    }
  }
}
