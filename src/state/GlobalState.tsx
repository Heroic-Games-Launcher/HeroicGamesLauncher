import React, { PureComponent } from 'react'

import {
  FavouriteGame,
  GameInfo,
  GameStatus,
  HiddenGame,
  InstalledInfo,
  LibraryTopSectionOptions,
  RefreshOptions,
  WineVersionInfo
} from 'src/types'
import { TFunction, withTranslation } from 'react-i18next'
import { getLegendaryConfig, getPlatform, install, launch } from 'src/helpers'
import { i18n } from 'i18next'

import ContextProvider from './ContextProvider'
import { getRecentGames } from 'src/helpers/library'

import {
  configStore,
  gogConfigStore,
  gogInstalledGamesStore,
  gogLibraryStore,
  libraryStore,
  wineDownloaderInfoStore
} from '../helpers/electronStores'

const storage: Storage = window.localStorage
const { ipcRenderer } = window.require('electron')

const RTL_LANGUAGES = ['fa']

type T = TFunction<'gamepage'> & TFunction<'translations'>

interface Props {
  children: React.ReactNode
  i18n: i18n
  t: T
}

interface StateProps {
  category: string
  epicLibrary: GameInfo[]
  gogLibrary: GameInfo[]
  wineVersions: WineVersionInfo[]
  error: boolean
  filter: string
  filterText: string
  filterPlatform: string
  gameUpdates: string[]
  language: string
  layout: string
  libraryStatus: GameStatus[]
  libraryTopSection: string
  platform: string
  refreshing: boolean
  hiddenGames: HiddenGame[]
  showHidden: boolean
  favouriteGames: FavouriteGame[]
}

export class GlobalState extends PureComponent<Props> {
  loadGOGLibrary = (): Array<GameInfo> => {
    const games = gogLibraryStore.has('games')
      ? (gogLibraryStore.get('games') as GameInfo[])
      : []
    const installedGames =
      (gogInstalledGamesStore.get('installed') as Array<InstalledInfo>) || []
    for (const igame in games) {
      for (const installedGame in installedGames) {
        if (installedGames[installedGame].appName == games[igame].app_name) {
          games[igame].install = installedGames[installedGame]
          games[igame].is_installed = true
        }
      }
    }

    return games
  }
  state: StateProps = {
    category: 'epic',
    epicLibrary: libraryStore.has('library')
      ? (libraryStore.get('library') as GameInfo[])
      : [],
    gogLibrary: this.loadGOGLibrary(),
    wineVersions: wineDownloaderInfoStore.has('wine-releases')
      ? (wineDownloaderInfoStore.get('wine-releases') as WineVersionInfo[])
      : [],
    error: false,
    filter: 'all',
    filterText: '',
    filterPlatform: 'all',
    gameUpdates: [],
    language: '',
    layout: 'grid',
    libraryStatus: [],
    libraryTopSection: 'disabled',
    platform: '',
    refreshing: false,
    hiddenGames: (configStore.get('games.hidden') as Array<HiddenGame>) || [],
    showHidden: false,
    favouriteGames:
      (configStore.get('games.favourites') as Array<FavouriteGame>) || []
  }

  setShowHidden = (value: boolean) => {
    this.setState({ showHidden: value })
  }

  hideGame = (appNameToHide: string, appTitle: string) => {
    const newHiddenGames = [
      ...this.state.hiddenGames,
      { appName: appNameToHide, title: appTitle }
    ]

    this.setState({
      hiddenGames: newHiddenGames
    })
    configStore.set('games.hidden', newHiddenGames)
  }

  unhideGame = (appNameToUnhide: string) => {
    const newHiddenGames = this.state.hiddenGames.filter(
      ({ appName }) => appName !== appNameToUnhide
    )

    this.setState({
      hiddenGames: newHiddenGames
    })
    configStore.set('games.hidden', newHiddenGames)
  }

  addGameToFavourites = (appNameToAdd: string, appTitle: string) => {
    const newFavouriteGames = [
      ...this.state.favouriteGames.filter(
        (fav) => fav.appName !== appNameToAdd
      ),
      { appName: appNameToAdd, title: appTitle }
    ]

    this.setState({
      favouriteGames: newFavouriteGames
    })
    configStore.set('games.favourites', newFavouriteGames)
  }

  removeGameFromFavourites = (appNameToRemove: string) => {
    const newFavouriteGames = this.state.favouriteGames.filter(
      ({ appName }) => appName !== appNameToRemove
    )

    this.setState({
      favouriteGames: newFavouriteGames
    })
    configStore.set('games.favourites', newFavouriteGames)
  }

  handleLibraryTopSection = (value: LibraryTopSectionOptions) => {
    this.setState({ libraryTopSection: value })
  }

  refresh = async (checkUpdates?: boolean): Promise<void> => {
    let updates = this.state.gameUpdates
    console.log('refreshing')
    const currentLibraryLength = this.state.epicLibrary?.length
    let epicLibrary: Array<GameInfo> =
      (libraryStore.get('library') as Array<GameInfo>) || []

    const gogLibrary: Array<GameInfo> = this.loadGOGLibrary()
    if (!epicLibrary.length || !this.state.epicLibrary.length) {
      ipcRenderer.send(
        'logInfo',
        'No cache found, getting data from legendary...'
      )
      const { library: legendaryLibrary } = await getLegendaryConfig()
      epicLibrary = legendaryLibrary
    }

    try {
      updates = checkUpdates
        ? await ipcRenderer.invoke('checkGameUpdates')
        : this.state.gameUpdates
    } catch (error) {
      ipcRenderer.send('logError', error)
    }

    this.setState({
      epicLibrary,
      gogLibrary,
      gameUpdates: updates,
      refreshing: false
    })

    if (currentLibraryLength !== epicLibrary.length) {
      ipcRenderer.send('logInfo', 'Force Update')
      this.forceUpdate()
    }
  }

  refreshLibrary = async ({
    checkForUpdates,
    fullRefresh,
    runInBackground = true
  }: RefreshOptions): Promise<void> => {
    this.setState({ refreshing: !runInBackground })
    ipcRenderer.send('logInfo', 'Refreshing Library')
    try {
      await ipcRenderer.invoke('refreshLibrary', fullRefresh)
    } catch (error) {
      ipcRenderer.send('logError', error)
    }
    this.refresh(checkForUpdates)
  }

  refreshWineVersionInfo = async (fetch: boolean): Promise<void> => {
    if (this.state.platform !== 'linux') {
      return
    }
    ipcRenderer.send('logInfo', 'Refreshing wine downloader releases')
    try {
      this.setState({ refreshing: true })
      const releases = await ipcRenderer.invoke('refreshWineVersionInfo', fetch)
      this.setState({
        wineVersions: releases,
        refreshing: false
      })
    } catch (error) {
      this.setState({ refreshing: false })
      console.error(error)
      ipcRenderer.send('logError', error)
      ipcRenderer.send('logError', 'Refreshing wine downloader releases failed')
    }
  }

  handleSearch = (input: string) => this.setState({ filterText: input })
  handleFilter = (filter: string) => this.setState({ filter })
  handlePlatformFilter = (filterPlatform: string) =>
    this.setState({ filterPlatform })
  handleLayout = (layout: string) => this.setState({ layout })
  handleCategory = (category: string) => this.setState({ category })

  filterLibrary = (library: GameInfo[], filter: string) => {
    if (!library) {
      return []
    }

    if (filter.includes('UE_')) {
      return library.filter((game) => {
        if (!game.compatible_apps) {
          return false
        }
        return game.compatible_apps.includes(filter)
      })
    } else {
      switch (filter) {
        case 'unreal':
          return library.filter(
            (game) =>
              game.is_ue_project || game.is_ue_asset || game.is_ue_plugin
          )
        case 'asset':
          return library.filter((game) => game.is_ue_asset)
        case 'plugin':
          return library.filter((game) => game.is_ue_plugin)
        case 'project':
          return library.filter((game) => game.is_ue_project)
        default:
          return library.filter((game) => game.is_game)
      }
    }
  }

  filterPlatform = (library: GameInfo[], filter: string) => {
    const { category, platform } = this.state

    if (category === 'epic' && platform === 'linux') {
      return library.filter((game) => game.is_game)
    }

    switch (filter) {
      case 'win':
        return library.filter((game) =>
          process.platform == 'darwin'
            ? !game.is_mac_native
            : !game.is_linux_native
        )
      case 'mac':
        return library.filter((game) => game.is_mac_native)
      case 'linux':
        return library.filter((game) => game.is_linux_native)
      default:
        return library.filter((game) => game.is_game)
    }
  }

  handleGameStatus = async ({
    appName,
    status,
    folder,
    progress
  }: GameStatus) => {
    const { libraryStatus, gameUpdates } = this.state
    const currentApp = libraryStatus.filter(
      (game) => game.appName === appName
    )[0]

    // add app to libraryStatus if it was not present
    if (!currentApp) {
      return this.setState({
        libraryStatus: [...libraryStatus, { appName, status, folder, progress }]
      })
    }

    // if the app's status didn't change, do nothing
    if (currentApp.status === status) {
      return
    }

    const newLibraryStatus = libraryStatus.filter(
      (game) => game.appName !== appName
    )

    // if the app is done installing or errored
    if (['error', 'done'].includes(status)) {
      // if the app was updating, remove from the available game updates
      if (currentApp.status === 'updating') {
        const updatedGamesUpdates = gameUpdates.filter(
          (game) => game !== appName
        )
        // This avoids calling legendary again before the previous process is killed when canceling
        this.refreshLibrary({
          checkForUpdates: true,
          runInBackground: true
        })

        return this.setState({
          gameUpdates: updatedGamesUpdates,
          libraryStatus: newLibraryStatus
        })
      }

      this.refreshLibrary({ runInBackground: true })
      this.setState({ libraryStatus: newLibraryStatus })
    }
  }

  async componentDidMount() {
    const { i18n, t } = this.props
    const { epicLibrary, gameUpdates = [], libraryStatus } = this.state

    // Deals launching from protocol. Also checks if the game is already running
    ipcRenderer.on('launchGame', async (e, appName, runner) => {
      const currentApp = libraryStatus.filter(
        (game) => game.appName === appName
      )[0]
      if (!currentApp) {
        // Add finding a runner for games
        return launch({ appName, t, runner })
      }
    })

    // TODO: show the install modal instead of just installing like this since it has no options to choose
    ipcRenderer.on('installGame', async (e, args) => {
      const currentApp = libraryStatus.filter(
        (game) => game.appName === appName
      )[0]
      const { appName, installPath, runner } = args
      if (!currentApp || (currentApp && currentApp.status !== 'installing')) {
        return install({
          appName,
          handleGameStatus: this.handleGameStatus,
          installPath,
          isInstalling: false,
          previousProgress: null,
          progress: {
            bytes: '0.00MiB',
            eta: '00:00:00',
            percent: '0.00%'
          },
          t,
          runner,
          platformToInstall: 'Windows'
        })
      }
    })

    ipcRenderer.on('setGameStatus', async (e, args: GameStatus) => {
      const { libraryStatus } = this.state
      this.handleGameStatus({ ...libraryStatus, ...args })
    })
    const legendaryUser = Boolean(configStore.get('userInfo'))
    const gogUser = Boolean(gogConfigStore.get('userData'))
    const platform = await getPlatform()
    const category = storage.getItem('category') || 'epic'
    const filter = storage.getItem('filter') || 'all'
    const layout = storage.getItem('layout') || 'grid'
    const language = storage.getItem('language') || 'en'
    const showHidden = JSON.parse(storage.getItem('show_hidden') || 'false')
    const libraryTopSection =
      storage.getItem('library_top_section') || 'recently_played'

    if (!legendaryUser) {
      await ipcRenderer.invoke('getUserInfo')
    }

    if (!gameUpdates.length) {
      const storedGameUpdates = JSON.parse(storage.getItem('updates') || '[]')
      this.setState({ gameUpdates: storedGameUpdates })
    }

    i18n.changeLanguage(language)
    this.setState({
      category,
      filter,
      language,
      layout,
      platform,
      showHidden,
      libraryTopSection
    })

    if (legendaryUser || gogUser) {
      this.refreshLibrary({
        checkForUpdates: true,
        fullRefresh: true,
        runInBackground: Boolean(epicLibrary.length)
      })
    }
  }

  componentDidUpdate() {
    const {
      filter,
      gameUpdates,
      libraryStatus,
      layout,
      category,
      showHidden,
      libraryTopSection
    } = this.state

    storage.setItem('category', category)
    storage.setItem('filter', filter)
    storage.setItem('layout', layout)
    storage.setItem('updates', JSON.stringify(gameUpdates))
    storage.setItem('show_hidden', JSON.stringify(showHidden))
    storage.setItem('library_top_section', libraryTopSection)

    const pendingOps = libraryStatus.filter(
      (game) => game.status !== 'playing'
    ).length
    if (pendingOps) {
      ipcRenderer.send('lock')
    } else {
      ipcRenderer.send('unlock')
    }
  }

  render() {
    const { children } = this.props
    const {
      epicLibrary,
      wineVersions,
      gogLibrary,
      filterText,
      filter,
      platform,
      filterPlatform
    } = this.state
    let filteredEpicLibrary = epicLibrary
    let filteredGOGLibrary = gogLibrary
    const language = storage.getItem('language') || 'en'
    const isRTL = RTL_LANGUAGES.includes(language)

    try {
      const filterRegex = new RegExp(filterText, 'i')
      const textFilter = ({ title, app_name }: GameInfo) =>
        filterRegex.test(title) || filterRegex.test(app_name)
      filteredEpicLibrary = this.filterPlatform(
        this.filterLibrary(epicLibrary, filter).filter(textFilter),
        filterPlatform
      )
      filteredGOGLibrary = this.filterPlatform(
        this.filterLibrary(gogLibrary, filter).filter(textFilter),
        filterPlatform
      )
    } catch (error) {
      console.log(error)
    }

    let recentGames: GameInfo[] = []

    if (epicLibrary.length > 0) {
      recentGames = [...getRecentGames(epicLibrary)]
    }
    if (gogLibrary.length > 0) {
      recentGames = [...recentGames, ...getRecentGames(gogLibrary)]
    }

    const hiddenGamesAppNames = this.state.hiddenGames.map(
      (hidden) => hidden.appName
    )

    if (!this.state.showHidden) {
      filteredEpicLibrary = filteredEpicLibrary.filter(
        (game) => !hiddenGamesAppNames.includes(game.app_name)
      )
      filteredGOGLibrary = filteredGOGLibrary.filter(
        (game) => !hiddenGamesAppNames.includes(game.app_name)
      )
    }

    return (
      <ContextProvider.Provider
        value={{
          ...this.state,
          epicLibrary: filteredEpicLibrary,
          gogLibrary: filteredGOGLibrary,
          wineVersions: wineVersions,
          handleCategory: this.handleCategory,
          handleFilter: this.handleFilter,
          handleGameStatus: this.handleGameStatus,
          handleLayout: this.handleLayout,
          handlePlatformFilter: this.handlePlatformFilter,
          handleSearch: this.handleSearch,
          isRTL,
          platform: platform,
          refresh: this.refresh,
          refreshLibrary: this.refreshLibrary,
          refreshWineVersionInfo: this.refreshWineVersionInfo,
          recentGames,
          hiddenGames: {
            list: this.state.hiddenGames,
            add: this.hideGame,
            remove: this.unhideGame
          },
          setShowHidden: this.setShowHidden,
          favouriteGames: {
            list: this.state.favouriteGames,
            add: this.addGameToFavourites,
            remove: this.removeGameFromFavourites
          },
          handleLibraryTopSection: this.handleLibraryTopSection
        }}
      >
        {children}
      </ContextProvider.Provider>
    )
  }
}

export default withTranslation()(GlobalState)
