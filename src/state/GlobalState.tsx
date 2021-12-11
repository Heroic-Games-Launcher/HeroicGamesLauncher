import React, { PureComponent } from 'react'

import { GameInfo, GameStatus, RefreshOptions } from 'src/types'
import { TFunction, withTranslation } from 'react-i18next'
import {
  getGameInfo,
  getLegendaryConfig,
  getPlatform,
  getProgress,
  install,
  launch,
  notify
} from 'src/helpers'
import { i18n } from 'i18next'

import ContextProvider from './ContextProvider'
import ElectronStore from 'electron-store'
import { getRecentGames } from 'src/helpers/library'

const storage: Storage = window.localStorage
const { ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})
const libraryStore: ElectronStore = new Store({
  cwd: 'store',
  name: 'library'
})

type T = TFunction<'gamepage'> & TFunction<'translations'>

interface Props {
  children: React.ReactNode
  i18n: i18n
  t: T
}

interface StateProps {
  category: string
  data: GameInfo[]
  error: boolean
  filter: string
  filterText: string
  gameUpdates: string[]
  language: string
  layout: string
  libraryStatus: GameStatus[]
  platform: string
  refreshing: boolean
}

export class GlobalState extends PureComponent<Props> {
  state: StateProps = {
    category: 'games',
    data: libraryStore.has('library')
      ? (libraryStore.get('library') as GameInfo[])
      : [],
    error: false,
    filter: 'all',
    filterText: '',
    gameUpdates: [],
    language: '',
    layout: 'grid',
    libraryStatus: [],
    platform: '',
    refreshing: false
  }

  refresh = async (checkUpdates?: boolean): Promise<void> => {
    let updates = this.state.gameUpdates
    const currentLibraryLength = this.state.data?.length
    let library: Array<GameInfo> =
      (libraryStore.get('library') as Array<GameInfo>) || []

    if (!library.length || !this.state.data.length) {
      ipcRenderer.send(
        'logInfo',
        'No cache found, getting data from legendary...'
      )
      const { library: legendaryLibrary } = await getLegendaryConfig()
      library = legendaryLibrary
    }

    try {
      updates = checkUpdates
        ? await ipcRenderer.invoke('checkGameUpdates')
        : this.state.gameUpdates
    } catch (error) {
      ipcRenderer.send('logError', error)
    }

    this.setState({
      filterText: '',
      data: library,
      gameUpdates: updates,
      refreshing: false
    })

    if (currentLibraryLength !== library.length) {
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

  handleSearch = (input: string) => this.setState({ filterText: input })
  handleFilter = (filter: string) => this.setState({ filter })
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
        case 'installed':
          return library.filter((game) => game.is_installed && game.is_game)
        case 'uninstalled':
          return library.filter((game) => !game.is_installed && game.is_game)
        case 'downloading':
          return library.filter((game) => {
            const currentApp = this.state.libraryStatus.filter(
              (app) => app.appName === game.app_name
            )[0]
            if (!currentApp || !game.is_game) {
              return false
            }
            return (
              currentApp.status === 'installing' ||
              currentApp.status === 'repairing' ||
              currentApp.status === 'updating' ||
              currentApp.status === 'moving'
            )
          })
        case 'updates':
          return library.filter((game) =>
            this.state.gameUpdates.includes(game.app_name)
          )
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

  handleGameStatus = async ({
    appName,
    status,
    folder,
    progress
  }: GameStatus) => {
    const { libraryStatus, gameUpdates } = this.state
    const { t } = this.props
    const currentApp =
      libraryStatus.filter((game) => game.appName === appName)[0] || {}
    const { title } = await getGameInfo(appName)

    if (currentApp && currentApp.status === status) {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      return this.setState({
        libraryStatus: [...updatedLibraryStatus, { ...currentApp }]
      })
    }

    if (
      currentApp &&
      currentApp.status === 'installing' &&
      status === 'error'
    ) {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )

      this.setState({
        filter: 'installed',
        libraryStatus: updatedLibraryStatus
      })
      this.refreshLibrary({})

      return notify([title, 'notify.install.error'])
    }

    if (currentApp && currentApp.status === 'installing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )

      this.setState({
        filter: 'installed',
        libraryStatus: updatedLibraryStatus
      })

      const progress = await ipcRenderer.invoke('requestGameProgress', appName)
      const percent = getProgress(progress)

      let notifyKey = 'imported'
      if (percent) {
        notifyKey = 'canceled'
        let filter = 'all'

        if (percent > 95) {
          notifyKey = 'finished'
          filter = 'installed'
          ipcRenderer.send('addShortcut', appName, { desktop: true, startMenu: true })
        }

        this.handleFilter(filter)
      }

      notify([title, t(`notify.install.${notifyKey}`)])
      return this.refreshLibrary({})
    }

    if (currentApp && currentApp.status === 'updating' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      const updatedGamesUpdates = gameUpdates.filter((game) => game !== appName)
      this.setState({
        filter: 'installed',
        gameUpdates: updatedGamesUpdates,
        libraryStatus: updatedLibraryStatus
      })

      const progress = await ipcRenderer.invoke('requestGameProgress', appName)
      const percent = getProgress(progress)
      const message =
        percent < 95 ? t('notify.update.canceled') : t('notify.update.finished')
      notify([title, message])
      // This avoids calling legendary again before the previous process is killed when canceling
      setTimeout(() => {
        return this.refreshLibrary({ checkForUpdates: true })
      }, 2000)
    }

    if (currentApp && currentApp.status === 'repairing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({
        filter: 'installed',
        libraryStatus: updatedLibraryStatus
      })
      notify([title, t('notify.finished.reparing')])

      return this.refresh()
    }

    if (
      currentApp &&
      currentApp.status === 'uninstalling' &&
      status === 'done'
    ) {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })
      ipcRenderer.send('removeShortcut', appName)
      notify([title, t('notify.uninstalled')])

      return this.refreshLibrary({})
    }

    if (currentApp && currentApp.status === 'moving' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({
        filter: 'installed',
        libraryStatus: updatedLibraryStatus
      })
      notify([title, t('notify.moved')])

      return this.refresh()
    }

    if (status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      return this.setState({ libraryStatus: updatedLibraryStatus })
    }

    return this.setState({
      libraryStatus: [...libraryStatus, { appName, status, folder, progress }]
    })
  }

  checkVersion = async () => {
    const { t } = this.props
    const newVersion = await ipcRenderer.invoke('checkVersion')
    if (newVersion) {
      const { response } = await ipcRenderer.invoke('openMessageBox', {
        buttons: [t('box.yes'), t('box.no')],
        message: t(
          'box.appupdate.message',
          'There is a new version of Heroic Available, do you want to update now?'
        ),
        title: t('box.appupdate.title', 'Update Available')
      })

      if (response === 0) {
        ipcRenderer.send('openReleases')
      }
    }
  }

  async componentDidMount() {
    const { i18n, t } = this.props
    const { data, gameUpdates = [], libraryStatus } = this.state

    // Deals launching from protocol. Also checks if the game is already running
    ipcRenderer.on('launchGame', async (e, appName) => {
      const currentApp = libraryStatus.filter(
        (game) => game.appName === appName
      )[0]
      if (!currentApp) {
        await this.handleGameStatus({ appName, status: 'playing' })
        return launch({ appName, t, handleGameStatus: this.handleGameStatus })
      }
    })

    ipcRenderer.on('installGame', async (e, appName) => {
      const currentApp = libraryStatus.filter(
        (game) => game.appName === appName
      )[0]
      if (!currentApp || (currentApp && currentApp.status !== 'installing')) {
        await this.handleGameStatus({ appName, status: 'installing' })
        return install({
          appName,
          handleGameStatus: this.handleGameStatus,
          installPath: 'default',
          isInstalling: false,
          previousProgress: null,
          progress: {
            bytes: '0.00MiB',
            eta: '00:00:00',
            percent: '0.00%'
          },
          t
        })
      }
    })

    const user = configStore.get('userInfo')
    const platform = await getPlatform()
    const category = storage.getItem('category') || 'games'
    const filter = storage.getItem('filter') || 'all'
    const layout = storage.getItem('layout') || 'grid'
    const language = storage.getItem('language') || 'en'

    if (!user) {
      await ipcRenderer.invoke('getUserInfo')
    }

    if (!gameUpdates.length) {
      const storedGameUpdates = JSON.parse(storage.getItem('updates') || '[]')
      this.setState({ gameUpdates: storedGameUpdates })
    }

    i18n.changeLanguage(language)
    this.setState({ category, filter, language, layout, platform })

    if (user) {
      this.refreshLibrary({
        checkForUpdates: true,
        fullRefresh: true,
        runInBackground: Boolean(data.length)
      })
    }

    setTimeout(() => {
      this.checkVersion()
    }, 4500)
  }

  componentDidUpdate() {
    const { filter, gameUpdates, libraryStatus, layout, category } = this.state

    storage.setItem('category', category)
    storage.setItem('filter', filter)
    storage.setItem('layout', layout)
    storage.setItem('updates', JSON.stringify(gameUpdates))

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
    const { data, filterText, filter, platform } = this.state

    let filteredLibrary = data

    try {
      const filterRegex = new RegExp(filterText, 'i')
      const textFilter = ({ title, app_name }: GameInfo) =>
        filterRegex.test(title) || filterRegex.test(app_name)
      filteredLibrary = this.filterLibrary(data, filter).filter(textFilter)
    } catch (error) {
      console.log(error)
    }

    return (
      <ContextProvider.Provider
        value={{
          ...this.state,
          data: filteredLibrary,
          handleCategory: this.handleCategory,
          handleFilter: this.handleFilter,
          handleGameStatus: this.handleGameStatus,
          handleLayout: this.handleLayout,
          handleSearch: this.handleSearch,
          platform: platform,
          refresh: this.refresh,
          refreshLibrary: this.refreshLibrary,
          recentGames: getRecentGames(data)
        }}
      >
        {children}
      </ContextProvider.Provider>
    )
  }
}

export default withTranslation()(GlobalState)
