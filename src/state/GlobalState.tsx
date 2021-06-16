import React, { PureComponent } from 'react'

import { GameInfo, GameStatus } from 'src/types'
import { IpcRenderer } from 'electron'
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
import UpdateComponent from 'src/components/UI/UpdateComponent'

import ContextProvider from './ContextProvider'

const storage: Storage = window.localStorage
const { ipcRenderer } = window.require('electron')

const renderer: IpcRenderer = ipcRenderer

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
  user: string
}

export class GlobalState extends PureComponent<Props> {
  state: StateProps = {
    category: 'games',
    data: [],
    error: false,
    filter: 'all',
    filterText: '',
    gameUpdates: [],
    language: '',
    layout: 'grid',
    libraryStatus: [],
    platform: '',
    refreshing: false,
    user: ''
  }

  refresh = async (checkUpdates?: boolean): Promise<void> => {
    this.setState({ refreshing: true })
    const { user, library } = await getLegendaryConfig()
    const updates = checkUpdates ? await renderer.invoke('checkGameUpdates') : this.state.gameUpdates

    this.setState({
      data: library,
      filterText: '',
      gameUpdates: updates,
      refreshing: false,
      user
    })
  }

  refreshLibrary = async (checkUpdates?: boolean): Promise<void> => {
    this.setState({ refreshing: true })
    await renderer.invoke('refreshLibrary')
    this.refresh(checkUpdates)
  }

  handleSearch = (input: string) => this.setState({ filterText: input })
  handleFilter = (filter: string) => this.setState({ filter })
  handleLayout = (layout: string) => this.setState({ layout })
  handleCategory = (category: string) => this.setState({ category })

  filterLibrary = (library: GameInfo[], filter: string) => {
    if (filter.includes('UE_')) {
      return library.filter((game) => {
        if(!game.compatible_apps) {
          return false;
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
        return library.filter(game => this.state.gameUpdates.includes(game.app_name))
      case 'unreal':
        return library.filter((game) => game.is_ue_project || game.is_ue_asset || game.is_ue_plugin)
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

  handleGameStatus = async ({ appName, status }: GameStatus) => {
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

    if (currentApp && currentApp.status === 'installing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )

      this.setState({ libraryStatus: updatedLibraryStatus })

      const progress = await renderer.invoke('requestGameProgress', appName)
      const percent = getProgress(progress)

      if (percent) {
        const message =
          percent < 95
            ? t('notify.install.canceled')
            : t('notify.install.finished')
        notify([title, message])
        return this.refreshLibrary()
      }
      this.refreshLibrary()
      return notify([title, 'Game Imported'])
    }

    if (currentApp && currentApp.status === 'updating' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      const updatedGamesUpdates = gameUpdates.filter(game => game !== appName)
      this.setState({ gameUpdates: updatedGamesUpdates, libraryStatus: updatedLibraryStatus })

      const progress = await renderer.invoke('requestGameProgress', appName)
      const percent = getProgress(progress)
      const message =
        percent < 95 ? t('notify.update.canceled') : t('notify.update.finished')
      notify([title, message])
      return this.refresh()
    }

    if (currentApp && currentApp.status === 'repairing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })
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
      notify([title, t('notify.uninstalled')])

      return this.refreshLibrary()
    }

    if (currentApp && currentApp.status === 'moving' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })
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
      libraryStatus: [...libraryStatus, { appName, status }]
    })
  }

  checkVersion = async () => {
    const { t } = this.props
    const newVersion = await renderer.invoke('checkVersion')
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
        renderer.send('openReleases')
      }
    }
  }

  async componentDidMount() {
    const { i18n, t } = this.props
    const { gameUpdates, libraryStatus } = this.state

    // Deals launching from protocol. Also checks if the game is already running
    ipcRenderer.once('launchGame', async (e, appName) => {
      const currentApp = libraryStatus.filter(game => game.appName === appName)[0]
      if (!currentApp) {
        await this.handleGameStatus({ appName, status: 'playing' })
        return launch(appName, t, this.handleGameStatus)
      }
    })

    ipcRenderer.once('installGame', async (e, appName) => {
      const currentApp = libraryStatus.filter(game => game.appName === appName)[0]
      if (!currentApp || currentApp && currentApp.status !== 'installing') {
        await this.handleGameStatus({ appName, status: 'installing' })
        return install({appName,
          handleGameStatus: this.handleGameStatus, installPath: 'default', isInstalling: false, previousProgress: null, progress: {
            bytes: '0.00MiB',
            eta: '00:00:00',
            percent: '0.00%'
          }, t})
      }
    })

    const platform = await getPlatform()
    const category = storage.getItem('category') || 'games'
    const filter = storage.getItem('filter') || 'all'
    const layout = storage.getItem('layout') || 'grid'
    const language = storage.getItem('language') || 'en'

    if (!gameUpdates.length){
      const storedGameUpdates = JSON.parse(storage.getItem('updates') || '[]')
      this.setState({gameUpdates: storedGameUpdates})
    }

    i18n.changeLanguage(language)
    this.setState({ category, filter, language, layout, platform })

    setTimeout(() => {
      this.checkVersion()
    }, 4500)
    this.refreshLibrary(true)
  }

  componentDidUpdate() {
    const { filter, gameUpdates, libraryStatus, layout, category } = this.state

    storage.setItem('category', category)
    storage.setItem('filter', filter)
    storage.setItem('layout', layout)
    storage.setItem('updates', JSON.stringify(gameUpdates))
    const pendingOps = libraryStatus.filter((game) => game.status !== 'playing')
      .length
    if (pendingOps) {
      renderer.send('lock')
    } else {
      renderer.send('unlock')
    }
  }

  render() {
    const { children } = this.props
    const { data, filterText, filter, platform, refreshing } = this.state

    if (refreshing) {
      return <UpdateComponent />
    }

    const filterRegex = new RegExp(String(filterText), 'i')
    const textFilter = ({ title }: GameInfo) => filterRegex.test(title)
    const filteredLibrary = this.filterLibrary(data, filter).filter(textFilter)

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
          refreshLibrary: this.refreshLibrary
        }}
      >
        {children}
      </ContextProvider.Provider>
    )
  }
}

export default withTranslation()(GlobalState)
