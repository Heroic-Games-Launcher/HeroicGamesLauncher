import React, { PureComponent } from 'react'

import {
  ConnectivityStatus,
  FavouriteGame,
  GameInfo,
  GameStatus,
  HiddenGame,
  InstalledInfo,
  RefreshOptions,
  Runner,
  WineVersionInfo,
  UserInfo,
  InstallParams,
  LibraryTopSectionOptions,
  AppSettings
} from 'common/types'
import {
  Category,
  DialogModalOptions,
  ExternalLinkDialogOptions
} from 'frontend/types'
import { TFunction, withTranslation } from 'react-i18next'
import {
  getGameInfo,
  getLegendaryConfig,
  getPlatform,
  install,
  launch,
  notify
} from '../helpers'
import { i18n, t } from 'i18next'

import ContextProvider from './ContextProvider'

import {
  configStore,
  gogConfigStore,
  gogInstalledGamesStore,
  gogLibraryStore,
  libraryStore,
  wineDownloaderInfoStore
} from '../helpers/electronStores'
import { sideloadLibrary } from 'frontend/helpers/electronStores'

const storage: Storage = window.localStorage
const globalSettings = configStore.get('settings', {}) as AppSettings

const RTL_LANGUAGES = ['fa', 'ar']

type T = TFunction<'gamepage'> & TFunction<'translations'>

interface Props {
  children: React.ReactNode
  i18n: i18n
  t: T
}

interface StateProps {
  category: Category
  epic: {
    library: GameInfo[]
    username: string | null
  }
  gog: {
    library: GameInfo[]
    username: string | null
  }
  wineVersions: WineVersionInfo[]
  error: boolean
  filterText: string
  filterPlatform: string
  gameUpdates: string[]
  language: string
  layout: string
  libraryStatus: GameStatus[]
  libraryTopSection: string
  platform: NodeJS.Platform | 'unknown'
  refreshing: boolean
  refreshingInTheBackground: boolean
  hiddenGames: HiddenGame[]
  showHidden: boolean
  showFavourites: boolean
  favouriteGames: FavouriteGame[]
  theme: string
  zoomPercent: number
  primaryFontFamily: string
  secondaryFontFamily: string
  allTilesInColor: boolean
  sidebarCollapsed: boolean
  activeController: string
  connectivity: { status: ConnectivityStatus; retryIn: number }
  dialogModalOptions: DialogModalOptions
  externalLinkDialogOptions: ExternalLinkDialogOptions
  sideloadedLibrary: GameInfo[]
  hideChangelogsOnStartup: boolean
  lastChangelogShown: string | null
}

export class GlobalState extends PureComponent<Props> {
  loadGOGLibrary = (): Array<GameInfo> => {
    const games = gogLibraryStore.has('games')
      ? (gogLibraryStore.get('games', []) as GameInfo[])
      : []
    const installedGames =
      (gogInstalledGamesStore.get('installed', []) as Array<InstalledInfo>) ||
      []
    for (const igame in games) {
      for (const installedGame of installedGames) {
        if (installedGame.appName === games[igame].app_name) {
          games[igame].install = installedGame
          games[igame].is_installed = true
        }
      }
    }

    return games
  }
  state: StateProps = {
    category: (storage.getItem('category') as Category) || 'legendary',
    epic: {
      library: libraryStore.has('library')
        ? (libraryStore.get('library', []) as GameInfo[])
        : [],
      username:
        (configStore.get('userInfo', null) as UserInfo)?.displayName || null
    },
    gog: {
      library: this.loadGOGLibrary(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      username: (gogConfigStore.get('userData', null) as any)?.username || null
    },
    wineVersions: wineDownloaderInfoStore.has('wine-releases')
      ? (wineDownloaderInfoStore.get('wine-releases', []) as WineVersionInfo[])
      : [],
    error: false,
    filterText: '',
    filterPlatform: 'all',
    gameUpdates: [],
    language: this.props.i18n.language,
    layout: storage.getItem('layout') || 'grid',
    libraryStatus: [],
    libraryTopSection: globalSettings.libraryTopSection || 'disabled',
    platform: 'unknown',
    refreshing: false,
    refreshingInTheBackground: true,
    hiddenGames:
      (configStore.get('games.hidden', []) as Array<HiddenGame>) || [],
    showHidden: JSON.parse(storage.getItem('show_hidden') || 'false'),
    showFavourites: JSON.parse(storage.getItem('show_favorites') || 'false'),
    sidebarCollapsed: JSON.parse(
      storage.getItem('sidebar_collapsed') || 'false'
    ),
    favouriteGames:
      (configStore.get('games.favourites', []) as Array<FavouriteGame>) || [],
    theme: (configStore.get('theme', '') as string) || '',
    zoomPercent: parseInt(
      (configStore.get('zoomPercent', '100') as string) || '100'
    ),
    secondaryFontFamily:
      (configStore.get('contentFontFamily') as string) ||
      getComputedStyle(document.documentElement).getPropertyValue(
        '--default-secondary-font-family'
      ),
    primaryFontFamily:
      (configStore.get('actionsFontFamily') as string) ||
      getComputedStyle(document.documentElement).getPropertyValue(
        '--default-primary-font-family'
      ),
    allTilesInColor: (configStore.get('allTilesInColor') as boolean) || false,
    activeController: '',
    connectivity: { status: 'offline', retryIn: 0 },
    sideloadedLibrary: sideloadLibrary.get('games', []) as GameInfo[],
    dialogModalOptions: { showDialog: false },
    externalLinkDialogOptions: { showDialog: false },
    hideChangelogsOnStartup: globalSettings.hideChangelogsOnStartup,
    lastChangelogShown: JSON.parse(storage.getItem('last_changelog') || 'null')
  }

  setLanguage = (newLanguage: string) => {
    this.setState({ language: newLanguage })
  }

  setTheme = (newThemeName: string) => {
    configStore.set('theme', newThemeName)
    this.setState({ theme: newThemeName })
    window.setTheme(newThemeName)
  }

  zoomTimer: NodeJS.Timeout | undefined = undefined
  setZoomPercent = (newZoomPercent: number) => {
    if (this.zoomTimer) clearTimeout(this.zoomTimer)

    configStore.set('zoomPercent', newZoomPercent)
    this.setState({ zoomPercent: newZoomPercent })

    this.zoomTimer = setTimeout(() => {
      window.api.setZoomFactor((newZoomPercent / 100).toString())
    }, 500)
  }

  setPrimaryFontFamily = (newFontFamily: string, saveToFile = true) => {
    if (saveToFile) configStore.set('actionsFontFamily', newFontFamily)
    document.documentElement.style.setProperty(
      '--primary-font-family',
      newFontFamily
    )
  }

  setSecondaryFontFamily = (newFontFamily: string, saveToFile = true) => {
    if (saveToFile) configStore.set('contentFontFamily', newFontFamily)
    document.documentElement.style.setProperty(
      '--secondary-font-family',
      newFontFamily
    )
  }

  setAllTilesInColor = (value: boolean) => {
    configStore.set('allTilesInColor', value)
    this.setState({ allTilesInColor: value })
  }

  setShowHidden = (value: boolean) => {
    this.setState({ showHidden: value })
  }

  setShowFavourites = (value: boolean) => {
    this.setState({ showFavourites: value })
  }

  setSideBarCollapsed = (value: boolean) => {
    this.setState({ sidebarCollapsed: value })
  }

  setHideChangelogsOnStartup = (value: boolean) => {
    this.setState({ hideChangelogsOnStartup: value })
  }

  setLastChangelogShown = (value: string) => {
    this.setState({ lastChangelogShown: value })
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

  handleShowDialogModal = ({
    showDialog = true,
    ...options
  }: DialogModalOptions) => {
    this.setState({
      dialogModalOptions: { showDialog, ...options }
    })
  }

  showResetDialog = (() => {
    this.handleShowDialogModal({
      title: t('box.reset-heroic.question.title', 'Reset Heroic'),
      message: t(
        'box.reset-heroic.question.message',
        "Are you sure you want to reset Heroic? This will remove all Settings and Caching but won't remove your Installed games or your Epic credentials. Portable versions (AppImage, WinPortable, ...) of heroic needs to be restarted manually afterwards."
      ),
      buttons: [
        { text: t('box.yes'), onClick: window.api.resetHeroic },
        { text: t('box.no') }
      ]
    })
  }).bind(this)

  handleExternalLinkDialog = (value: ExternalLinkDialogOptions) => {
    this.setState({ externalLinkDialogOptions: value })
  }

  handleLibraryTopSection = (value: LibraryTopSectionOptions) => {
    this.setState({ libraryTopSection: value })
  }

  handleSuccessfulLogin = (runner: Runner) => {
    this.handleCategory('all')
    this.refreshLibrary({
      fullRefresh: true,
      runInBackground: false,
      library: runner
    })
  }

  epicLogin = async (sid: string) => {
    console.log('logging epic')
    const response = await window.api.login(sid)

    if (response.status === 'done') {
      this.setState({
        epic: {
          library: [],
          username: response.data?.displayName
        }
      })

      this.handleSuccessfulLogin('legendary')
    }

    return response.status
  }

  epicLogout = async () => {
    this.setState({ refreshing: true })
    await window.api.logoutLegendary().finally(() => {
      this.setState({
        epic: {
          library: [],
          username: null
        }
      })
    })
    console.log('Logging out from epic')
    this.setState({ refreshing: false })
    window.location.reload()
  }

  gogLogin = async (token: string) => {
    console.log('logging gog')
    const response = await window.api.authGOG(token)

    if (response.status === 'done') {
      this.setState({
        gog: {
          library: [],
          username: response.data?.username
        }
      })

      this.handleSuccessfulLogin('gog')
    }

    return response.status
  }

  gogLogout = async () => {
    await window.api.logoutGOG()
    this.setState({
      gog: {
        library: [],
        username: null
      }
    })
    console.log('Logging out from gog')
    window.location.reload()
  }

  refresh = async (
    library?: Runner | 'all',
    checkUpdates = false
  ): Promise<void> => {
    console.log('refreshing')

    const currentLibraryLength = this.state.epic.library?.length
    let epicLibrary: Array<GameInfo> =
      (libraryStore.get('library', []) as Array<GameInfo>) || []

    const gogLibrary: Array<GameInfo> = this.loadGOGLibrary()
    if (!epicLibrary.length || !this.state.epic.library.length) {
      window.api.logInfo('No cache found, getting data from legendary...')
      const { library: legendaryLibrary } = await getLegendaryConfig()
      epicLibrary = legendaryLibrary
    }

    let updates = this.state.gameUpdates
    if (checkUpdates && library) {
      try {
        updates = await window.api.checkGameUpdates()
      } catch (error) {
        window.api.logError(`${error}`)
      }
    }

    const updatedSideload = sideloadLibrary.get('games', []) as GameInfo[]

    this.setState({
      epic: {
        library: epicLibrary,
        username: this.state.epic.username
      },
      gog: {
        library: gogLibrary,
        username: this.state.gog.username
      },
      gameUpdates: updates,
      refreshing: false,
      refreshingInTheBackground: true,
      sideloadedLibrary: updatedSideload
    })

    if (currentLibraryLength !== epicLibrary.length) {
      window.api.logInfo('Force Update')
      this.forceUpdate()
    }
  }

  refreshLibrary = async ({
    checkForUpdates,
    fullRefresh,
    runInBackground = true,
    library = undefined
  }: RefreshOptions): Promise<void> => {
    if (this.state.refreshing) return

    this.setState({
      refreshing: true,
      refreshingInTheBackground: runInBackground
    })
    window.api.logInfo('Refreshing Library')
    try {
      await window.api.refreshLibrary(fullRefresh, library)
      return await this.refresh(library, checkForUpdates)
    } catch (error) {
      window.api.logError(`${error}`)
    }
  }

  refreshWineVersionInfo = async (fetch: boolean): Promise<void> => {
    if (this.state.platform !== 'linux') {
      return
    }
    window.api.logInfo('Refreshing wine downloader releases')
    this.setState({ refreshing: true })
    await window.api
      .refreshWineVersionInfo(fetch)
      .then(() => {
        this.setState({
          refreshing: false
        })
        return
      })
      .catch(async () => {
        this.setState({ refreshing: false })
        window.api.logError('Sync with upstream releases failed')

        notify({
          title: 'Wine-Manager',
          body: t(
            'notify.refresh.error',
            "Couldn't fetch releases from upstream, maybe because of Github API restrictions! Try again later."
          )
        })
        return
      })
  }

  handleSearch = (input: string) => this.setState({ filterText: input })
  handlePlatformFilter = (filterPlatform: string) =>
    this.setState({ filterPlatform })
  handleLayout = (layout: string) => this.setState({ layout })
  handleCategory = (category: Category) => this.setState({ category })

  handleGameStatus = async ({
    appName,
    status,
    folder,
    progress,
    runner
  }: GameStatus) => {
    const { libraryStatus, gameUpdates } = this.state
    const currentApp = libraryStatus.find((game) => game.appName === appName)
    // add app to libraryStatus if it was not present
    if (!currentApp) {
      return this.setState({
        libraryStatus: [
          ...libraryStatus,
          { appName, status, folder, progress, runner }
        ]
      })
    }

    // if the app's status didn't change, do nothing
    if (currentApp.status === status) {
      return
    }

    let newLibraryStatus = libraryStatus

    if (status === 'installing') {
      currentApp.status = 'installing'
      // remove the item from the library to avoid duplicates then add the new status
      newLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      newLibraryStatus.push(currentApp)
    }

    if (status === 'updating') {
      currentApp.status = 'updating'
      // remove the item from the library to avoid duplicates then add the new status
      newLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      newLibraryStatus.push(currentApp)
    }

    // if the app is done installing or errored
    if (['error', 'done'].includes(status)) {
      // if the app was updating, remove from the available game updates
      newLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      if (currentApp.status === 'updating') {
        const updatedGamesUpdates = gameUpdates.filter(
          (game) => game !== appName
        )
        // This avoids calling legendary again before the previous process is killed when canceling
        this.refreshLibrary({
          checkForUpdates: true,
          runInBackground: true,
          library: runner
        })

        return this.setState({
          gameUpdates: updatedGamesUpdates,
          libraryStatus: newLibraryStatus
        })
      }

      this.refreshLibrary({ runInBackground: true, library: runner })
      this.setState({ libraryStatus: newLibraryStatus })
    }
  }

  async componentDidMount() {
    const { t } = this.props
    const { epic, gameUpdates = [], libraryStatus, category } = this.state
    const oldCategory: string = category
    if (oldCategory === 'epic') {
      this.handleCategory('all')
    }
    // Deals launching from protocol. Also checks if the game is already running
    window.api.handleLaunchGame(
      async (
        e: Event,
        appName: string,
        runner: Runner
      ): Promise<{ status: 'done' | 'error' }> => {
        const currentApp = libraryStatus.filter(
          (game) => game.appName === appName
        )[0]
        if (!currentApp) {
          return launch({
            appName,
            t,
            runner,
            hasUpdate: false,
            syncCloud: true,
            showDialogModal: this.handleShowDialogModal
          })
        }
        return { status: 'error' }
      }
    )

    // TODO: show the install modal instead of just installing like this since it has no options to choose
    window.api.handleInstallGame(async (e: Event, args: InstallParams) => {
      const currentApp = libraryStatus.filter(
        (game) => game.appName === appName
      )[0]
      const { appName, path, runner } = args
      if (!currentApp || (currentApp && currentApp.status !== 'installing')) {
        const gameInfo = await getGameInfo(appName, runner)
        if (!gameInfo) {
          return
        }
        return install({
          gameInfo,
          installPath: path,
          isInstalling: false,
          previousProgress: null,
          progress: {
            bytes: '0.00MiB',
            eta: '00:00:00',
            percent: 0
          },
          t,
          platformToInstall: 'Windows',
          showDialogModal: this.handleShowDialogModal
        })
      }
    })

    window.api.handleGameStatus(async (e: Event, args: GameStatus) => {
      const { libraryStatus } = this.state
      return this.handleGameStatus({ ...libraryStatus, ...args })
    })

    window.api.handleRefreshLibrary(async (e: Event, runner: Runner) => {
      this.refreshLibrary({
        checkForUpdates: false,
        fullRefresh: true,
        runInBackground: true,
        library: runner
      })
    })

    const legendaryUser = Boolean(configStore.get('userInfo', null))
    const gogUser = Boolean(gogConfigStore.get('userData', null))
    const platform = await getPlatform()

    if (legendaryUser) {
      await window.api.getUserInfo()
    }

    if (!gameUpdates.length) {
      const storedGameUpdates = JSON.parse(storage.getItem('updates') || '[]')
      this.setState({ gameUpdates: storedGameUpdates })
    }

    this.setState({ platform })

    if (legendaryUser || gogUser) {
      this.refreshLibrary({
        checkForUpdates: true,
        fullRefresh: true,
        runInBackground: Boolean(epic.library.length)
      })
    }

    window.addEventListener(
      'controller-changed',
      (e: CustomEvent<{ controllerId: string }>) => {
        this.setState({ activeController: e.detail.controllerId })
      }
    )

    // listen to custom connectivity-changed event to update state
    window.api.onConnectivityChanged((_, connectivity) => {
      this.setState({ connectivity })
    })

    // get the current status
    window.api
      .getConnectivityStatus()
      .then((connectivity) => this.setState({ connectivity }))

    this.setPrimaryFontFamily(this.state.primaryFontFamily, false)
    this.setSecondaryFontFamily(this.state.secondaryFontFamily, false)

    window.api.frontendReady()
  }

  componentDidUpdate() {
    const {
      gameUpdates,
      libraryStatus,
      layout,
      category,
      showHidden,
      showFavourites,
      sidebarCollapsed,
      hideChangelogsOnStartup,
      lastChangelogShown
    } = this.state

    storage.setItem('category', category)
    storage.setItem('layout', layout)
    storage.setItem('updates', JSON.stringify(gameUpdates))
    storage.setItem('show_hidden', JSON.stringify(showHidden))
    storage.setItem('show_favorites', JSON.stringify(showFavourites))
    storage.setItem('sidebar_collapsed', JSON.stringify(sidebarCollapsed))
    storage.setItem('hide_changelogs', JSON.stringify(hideChangelogsOnStartup))
    storage.setItem('last_changelog', JSON.stringify(lastChangelogShown))

    const pendingOps = libraryStatus.filter(
      (game) => game.status !== 'playing' && game.status !== 'done'
    ).length

    if (pendingOps) {
      window.api.lock()
    } else {
      window.api.unlock()
    }
  }

  render() {
    const isRTL = RTL_LANGUAGES.includes(this.state.language)

    return (
      <ContextProvider.Provider
        value={{
          ...this.state,
          epic: {
            library: this.state.epic.library,
            username: this.state.epic.username,
            login: this.epicLogin,
            logout: this.epicLogout
          },
          gog: {
            library: this.state.gog.library,
            username: this.state.gog.username,
            login: this.gogLogin,
            logout: this.gogLogout
          },
          handleCategory: this.handleCategory,
          handleGameStatus: this.handleGameStatus,
          handleLayout: this.handleLayout,
          handlePlatformFilter: this.handlePlatformFilter,
          handleSearch: this.handleSearch,
          setLanguage: this.setLanguage,
          isRTL,
          refresh: this.refresh,
          refreshLibrary: this.refreshLibrary,
          refreshWineVersionInfo: this.refreshWineVersionInfo,
          hiddenGames: {
            list: this.state.hiddenGames,
            add: this.hideGame,
            remove: this.unhideGame
          },
          setShowHidden: this.setShowHidden,
          setShowFavourites: this.setShowFavourites,
          favouriteGames: {
            list: this.state.favouriteGames,
            add: this.addGameToFavourites,
            remove: this.removeGameFromFavourites
          },
          handleLibraryTopSection: this.handleLibraryTopSection,
          setTheme: this.setTheme,
          setZoomPercent: this.setZoomPercent,
          setAllTilesInColor: this.setAllTilesInColor,
          setSideBarCollapsed: this.setSideBarCollapsed,
          setPrimaryFontFamily: this.setPrimaryFontFamily,
          setSecondaryFontFamily: this.setSecondaryFontFamily,
          showDialogModal: this.handleShowDialogModal,
          showResetDialog: this.showResetDialog,
          handleExternalLinkDialog: this.handleExternalLinkDialog,
          hideChangelogsOnStartup: this.state.hideChangelogsOnStartup,
          setHideChangelogsOnStartup: this.setHideChangelogsOnStartup,
          lastChangelogShown: this.state.lastChangelogShown,
          setLastChangelogShown: this.setLastChangelogShown
        }}
      >
        {this.props.children}
      </ContextProvider.Provider>
    )
  }
}

export default withTranslation()(GlobalState)
