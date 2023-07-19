import React, { PureComponent } from 'react'

import {
  ConnectivityStatus,
  FavouriteGame,
  GameInfo,
  GameStatus,
  HiddenGame,
  RefreshOptions,
  Runner,
  WineVersionInfo,
  InstallParams,
  LibraryTopSectionOptions
} from 'common/types'
import {
  Category,
  DialogModalOptions,
  ExternalLinkDialogOptions
} from 'frontend/types'
import { withTranslation } from 'react-i18next'
import {
  getGameInfo,
  getLegendaryConfig,
  getPlatform,
  launch,
  notify
} from '../helpers'
import { i18n, t, TFunction } from 'i18next'

import ContextProvider from './ContextProvider'
import { InstallModal } from 'frontend/screens/Library/components'

import {
  configStore,
  gogConfigStore,
  gogInstalledGamesStore,
  gogLibraryStore,
  libraryStore,
  nileConfigStore,
  nileLibraryStore,
  wineDownloaderInfoStore
} from '../helpers/electronStores'
import { sideloadLibrary } from 'frontend/helpers/electronStores'
import { IpcRendererEvent } from 'electron'
import { NileRegisterData } from 'common/types/nile'

const storage: Storage = window.localStorage
const globalSettings = configStore.get_nodefault('settings')

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
    username?: string
  }
  gog: {
    library: GameInfo[]
    username?: string
  }
  amazon: {
    library: GameInfo[]
    username?: string
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
  showNonAvailable: boolean
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
  settingsModalOpen: {
    value: boolean
    type: 'settings' | 'log'
    gameInfo?: GameInfo | null
  }
  showInstallModal: {
    show: boolean
    gameInfo: GameInfo | null
    appName: string
    runner: Runner
  }
}

class GlobalState extends PureComponent<Props> {
  loadGOGLibrary = (): Array<GameInfo> => {
    const games = gogLibraryStore.get('games', [])

    const installedGames = gogInstalledGamesStore.get('installed', [])
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
  loadAmazonLibrary = (): Array<GameInfo> => {
    const games = nileLibraryStore.get('library', [])

    return games
  }
  state: StateProps = {
    category: (storage.getItem('category') as Category) || 'legendary',
    epic: {
      library: libraryStore.get('library', []),
      username: configStore.get_nodefault('userInfo.displayName')
    },
    gog: {
      library: this.loadGOGLibrary(),
      username: gogConfigStore.get_nodefault('userData.username')
    },
    amazon: {
      library: this.loadAmazonLibrary(),
      username: nileConfigStore.get_nodefault('userData.name')
    },
    wineVersions: wineDownloaderInfoStore.get('wine-releases', []),
    error: false,
    filterText: '',
    filterPlatform: 'all',
    gameUpdates: [],
    language: this.props.i18n.language,
    layout: storage.getItem('layout') || 'grid',
    libraryStatus: [],
    libraryTopSection: globalSettings?.libraryTopSection || 'disabled',
    platform: 'unknown',
    refreshing: false,
    refreshingInTheBackground: true,
    hiddenGames: configStore.get('games.hidden', []),
    showHidden: JSON.parse(storage.getItem('show_hidden') || 'false'),
    showFavourites: JSON.parse(storage.getItem('show_favorites') || 'false'),
    showNonAvailable: true,
    sidebarCollapsed: JSON.parse(
      storage.getItem('sidebar_collapsed') || 'false'
    ),
    favouriteGames: configStore.get('games.favourites', []),
    theme: configStore.get('theme', ''),
    zoomPercent: configStore.get('zoomPercent', 100),
    secondaryFontFamily:
      configStore.get_nodefault('contentFontFamily') ||
      getComputedStyle(document.documentElement).getPropertyValue(
        '--default-secondary-font-family'
      ),
    primaryFontFamily:
      configStore.get_nodefault('actionsFontFamily') ||
      getComputedStyle(document.documentElement).getPropertyValue(
        '--default-primary-font-family'
      ),
    allTilesInColor: configStore.get('allTilesInColor', false),
    activeController: '',
    connectivity: { status: 'offline', retryIn: 0 },
    showInstallModal: {
      show: false,
      appName: '',
      runner: 'legendary',
      gameInfo: null
    },
    sideloadedLibrary: sideloadLibrary.get('games', []),
    dialogModalOptions: { showDialog: false },
    externalLinkDialogOptions: { showDialog: false },
    hideChangelogsOnStartup: globalSettings?.hideChangelogsOnStartup || false,
    lastChangelogShown: JSON.parse(storage.getItem('last_changelog') || 'null'),
    settingsModalOpen: { value: false, type: 'settings', gameInfo: undefined }
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

  setShowNonAvailable = (value: boolean) => {
    this.setState({ showNonAvailable: value })
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

  amazonLogin = async (data: NileRegisterData) => {
    console.log('logging amazon')
    const response = await window.api.authAmazon(data)

    if (response.status === 'done') {
      this.setState({
        amazon: {
          library: [],
          username: response.user?.name
        }
      })

      this.handleSuccessfulLogin('nile')
    }

    return response.status
  }

  amazonLogout = async () => {
    await window.api.logoutAmazon()
    this.setState({
      amazon: {
        library: [],
        username: null
      }
    })
    console.log('Logging out from amazon')
    window.location.reload()
  }

  getAmazonLoginData = async () => window.api.getAmazonLoginData()

  handleSettingsModalOpen = (
    value: boolean,
    type?: 'settings' | 'log',
    gameInfo?: GameInfo
  ) => {
    if (gameInfo) {
      this.setState({
        settingsModalOpen: { value, type, gameInfo }
      })
    } else {
      this.setState({
        settingsModalOpen: { value, gameInfo: null }
      })
    }
  }

  refresh = async (
    library?: Runner | 'all',
    checkUpdates = false
  ): Promise<void> => {
    console.log('refreshing')

    const { epic, gog, amazon, gameUpdates } = this.state

    let updates = gameUpdates
    if (checkUpdates) {
      try {
        updates = await window.api.checkGameUpdates()
      } catch (error) {
        window.api.logError(`${error}`)
      }
    }

    const currentLibraryLength = epic.library?.length

    let epicLibrary = libraryStore.get('library', [])
    if (epic.username && (!epicLibrary.length || !epic.library.length)) {
      window.api.logInfo('No cache found, getting data from legendary...')
      const { library: legendaryLibrary } = await getLegendaryConfig()
      epicLibrary = legendaryLibrary
    }

    let gogLibrary = this.loadGOGLibrary()
    if (gog.username && (!gogLibrary.length || !gog.library.length)) {
      window.api.logInfo('No cache found, getting data from gog...')
      await window.api.refreshLibrary('gog')
      gogLibrary = this.loadGOGLibrary()
    }

    let amazonLibrary = nileLibraryStore.get('library', [])
    if (amazon.username && (!amazonLibrary.length || !amazon.library.length)) {
      window.api.logInfo('No cache found, getting data from nile...')
      await window.api.refreshLibrary('nile')
      amazonLibrary = this.loadAmazonLibrary()
    }

    const updatedSideload = sideloadLibrary.get('games', [])

    this.setState({
      epic: {
        library: epicLibrary,
        username: epic.username
      },
      gog: {
        library: gogLibrary,
        username: gog.username
      },
      amazon: {
        library: amazonLibrary,
        username: amazon.username
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
    runInBackground = true,
    library = undefined
  }: RefreshOptions): Promise<void> => {
    if (this.state.refreshing) return

    this.setState({
      refreshing: true,
      refreshingInTheBackground: runInBackground
    })
    window.api.logInfo(`Refreshing ${library} Library`)
    try {
      if (!checkForUpdates || library === 'gog' || library === 'nile') {
        await window.api.refreshLibrary(library)
      }

      return await this.refresh(library, checkForUpdates)
    } catch (error) {
      window.api.logError(`${error}`)
    }
  }

  refreshWineVersionInfo = async (fetch: boolean): Promise<void> => {
    if (this.state.platform === 'win32') {
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

    // if the app's status did change, remove it from the current list and then handle the new status
    const newLibraryStatus = libraryStatus.filter(
      (game) => game.appName !== appName
    )

    // in these cases we just add the new status
    if (
      [
        'installing',
        'updating',
        'playing',
        'extracting',
        'launching',
        'ubisoft',
        'queued'
      ].includes(status)
    ) {
      newLibraryStatus.push({ appName, status, folder, progress, runner })
      this.setState({ libraryStatus: newLibraryStatus })
    }

    // when error or done we remove it from the status info
    if (['error', 'done'].includes(status)) {
      // also remove from updates if it was updating
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

        storage.setItem('updates', JSON.stringify(updatedGamesUpdates))
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
        e: IpcRendererEvent,
        appName: string,
        runner: Runner
      ): Promise<{ status: 'done' | 'error' | 'abort' }> => {
        const currentApp = libraryStatus.filter(
          (game) => game.appName === appName
        )[0]
        if (!currentApp) {
          return launch({
            appName,
            t,
            runner,
            hasUpdate: false,
            showDialogModal: this.handleShowDialogModal
          })
        }
        return { status: 'error' }
      }
    )

    window.api.handleInstallGame(
      async (e: IpcRendererEvent, args: InstallParams) => {
        const currentApp = libraryStatus.filter(
          (game) => game.appName === appName
        )[0]
        const { appName, runner } = args
        if (!currentApp || (currentApp && currentApp.status !== 'installing')) {
          const gameInfo = await getGameInfo(appName, runner)
          if (!gameInfo || gameInfo.runner === 'sideload') {
            return
          }
          return this.setState({
            showInstallModal: {
              show: true,
              appName,
              runner,
              gameInfo
            }
          })
        }
      }
    )

    window.api.handleGameStatus(
      async (e: IpcRendererEvent, args: GameStatus) => {
        return this.handleGameStatus({ ...args })
      }
    )

    window.api.handleRefreshLibrary(
      async (e: IpcRendererEvent, runner: Runner) => {
        this.refreshLibrary({
          checkForUpdates: false,
          runInBackground: true,
          library: runner
        })
      }
    )

    window.api.handleGamePush((e: IpcRendererEvent, args: GameInfo) => {
      if (!args.app_name) return
      if (args.runner === 'gog') {
        const library = [...this.state.gog.library]
        const index = library.findIndex(
          (game) => game.app_name === args.app_name
        )
        if (index !== -1) {
          library.splice(index, 1)
        }
        this.setState({
          gog: {
            library: [...library, args],
            username: this.state.gog.username
          }
        })
      }
    })

    const legendaryUser = configStore.has('userInfo')
    const gogUser = gogConfigStore.has('userData')
    const amazonUser = nileConfigStore.has('userData')
    const platform = await getPlatform()

    if (legendaryUser) {
      await window.api.getUserInfo()
    }

    if (amazonUser) {
      await window.api.getAmazonUserInfo()
    }

    if (!gameUpdates.length) {
      const storedGameUpdates = JSON.parse(storage.getItem('updates') || '[]')
      this.setState({ gameUpdates: storedGameUpdates })
    }

    this.setState({ platform })

    if (legendaryUser || gogUser || amazonUser) {
      this.refreshLibrary({
        checkForUpdates: true,
        runInBackground: Boolean(epic.library?.length)
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
    const {
      showInstallModal,
      language,
      epic,
      gog,
      amazon,
      favouriteGames,
      hiddenGames,
      settingsModalOpen,
      hideChangelogsOnStartup,
      lastChangelogShown
    } = this.state
    const isRTL = RTL_LANGUAGES.includes(language)

    return (
      <ContextProvider.Provider
        value={{
          ...this.state,
          epic: {
            library: epic.library,
            username: epic.username,
            login: this.epicLogin,
            logout: this.epicLogout
          },
          gog: {
            library: gog.library,
            username: gog.username,
            login: this.gogLogin,
            logout: this.gogLogout
          },
          amazon: {
            library: amazon.library,
            username: amazon.username,
            getLoginData: this.getAmazonLoginData,
            login: this.amazonLogin,
            logout: this.amazonLogout
          },
          handleCategory: this.handleCategory,
          handleLayout: this.handleLayout,
          handlePlatformFilter: this.handlePlatformFilter,
          handleSearch: this.handleSearch,
          setLanguage: this.setLanguage,
          isRTL,
          refresh: this.refresh,
          refreshLibrary: this.refreshLibrary,
          refreshWineVersionInfo: this.refreshWineVersionInfo,
          hiddenGames: {
            list: hiddenGames,
            add: this.hideGame,
            remove: this.unhideGame
          },
          setShowHidden: this.setShowHidden,
          setShowFavourites: this.setShowFavourites,
          setShowNonAvailable: this.setShowNonAvailable,
          favouriteGames: {
            list: favouriteGames,
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
          hideChangelogsOnStartup: hideChangelogsOnStartup,
          setHideChangelogsOnStartup: this.setHideChangelogsOnStartup,
          lastChangelogShown: lastChangelogShown,
          setLastChangelogShown: this.setLastChangelogShown,
          isSettingsModalOpen: settingsModalOpen,
          setIsSettingsModalOpen: this.handleSettingsModalOpen
        }}
      >
        {this.props.children}
        {showInstallModal.show && (
          <InstallModal
            appName={showInstallModal.appName}
            runner={showInstallModal.runner}
            gameInfo={showInstallModal.gameInfo}
            backdropClick={() =>
              this.setState({
                showInstallModal: { ...showInstallModal, show: false }
              })
            }
          />
        )}
      </ContextProvider.Provider>
    )
  }
}

export default withTranslation()(GlobalState)
