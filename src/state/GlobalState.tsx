import { Game, GameStatus } from '../types'
import { IpcRenderer } from 'electron'
import { TFunction, withTranslation } from 'react-i18next'
import {
  getGameInfo,
  getLegendaryConfig,
  getProgress,
  legendary,
  notify
} from '../helper'
import { i18n } from 'i18next'
import ContextProvider from './ContextProvider'
import React, { PureComponent } from 'react'
import UpdateComponent from '../components/UI/UpdateComponent'

const storage: Storage = window.localStorage
const { remote, ipcRenderer } = window.require('electron')
const { dialog, process } = remote
const { showMessageBox } = dialog

const renderer: IpcRenderer = ipcRenderer

interface Props {
  children: React.ReactNode
  i18n: i18n
  t: TFunction
}

interface StateProps {
  data: Game[]
  error: boolean
  filter: string
  filterText: string
  gameUpdates: string[]
  language: string
  layout: string
  libraryStatus: GameStatus[]
  refreshing: boolean
  user: string
}

export class GlobalState extends PureComponent<Props> {
  state: StateProps = {
    data: [],
    error: false,
    filter: 'all',
    filterText: '',
    gameUpdates: [],
    language: '',
    layout: 'grid',
    libraryStatus: [],
    refreshing: false,
    user: ''
  }

  refresh = async (): Promise<void> => {
    this.setState({ refreshing: true })
    const { user, library } = await getLegendaryConfig()
    const updates = await renderer.invoke('checkGameUpdates')

    console.log(process.platform)

    this.setState({
      data: library,
      filterText: '',
      gameUpdates: updates,
      refreshing: false,
      user
    })
  }

  refreshLibrary = async (): Promise<void> => {
    const { t } = this.props
    this.setState({ refreshing: true })
    await legendary('list-games')

    this.refresh()
    notify([t('notify.refreshing'), t('notify.refreshed')])
  }

  handleSearch = (input: string) => this.setState({ filterText: input })
  handleFilter = (filter: string) => this.setState({ filter })
  handleLayout = (layout: string) => this.setState({ layout })

  filterLibrary = (library: Game[], filter: string) => {
    switch (filter) {
      case 'installed':
        return library.filter((game) => game.isInstalled)
      case 'uninstalled':
        return library.filter((game) => !game.isInstalled)
      case 'downloading':
        return library.filter((game) => {
          const currentApp = this.state.libraryStatus.filter(
            (app) => app.appName === game.app_name
          )[0]
          if (!currentApp) {
            return false
          }
          return (
            currentApp.status === 'installing' ||
            currentApp.status === 'repairing' ||
            currentApp.status === 'updating' ||
            currentApp.status === 'moving'
          )
        })
      default:
        return library
    }
  }

  handleGameStatus = async ({ appName, status }: GameStatus) => {
    const { libraryStatus } = this.state
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
        return this.refresh()
      }
      this.refresh()
      return notify([title, 'Game Imported'])
    }

    if (currentApp && currentApp.status === 'updating' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })

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

      return this.refresh()
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
      const { response } = await showMessageBox({
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
    const { i18n } = this.props

    const filter = storage.getItem('filter') || 'all'
    const layout = storage.getItem('layout') || 'grid'
    const language = storage.getItem('language') || 'en'
    i18n.changeLanguage(language)
    this.setState({ filter, language, layout })

    setTimeout(() => {
      this.checkVersion()
    }, 4500)

    await this.refresh()

    const { data, user } = this.state
    if (user && !data.length) {
      this.refreshLibrary()
    }
  }

  componentDidUpdate() {
    const { filter, libraryStatus, layout } = this.state

    storage.setItem('filter', filter)
    storage.setItem('layout', layout)
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
    const { data, filterText, filter, refreshing } = this.state

    if (refreshing) {
      return <UpdateComponent />
    }

    const filterRegex = new RegExp(String(filterText), 'i')
    const textFilter = ({ title }: Game) => filterRegex.test(title)
    const filteredLibrary = this.filterLibrary(data, filter).filter(textFilter)

    return (
      <ContextProvider.Provider
        value={{
          ...this.state,
          data: filteredLibrary,
          handleFilter: this.handleFilter,
          handleGameStatus: this.handleGameStatus,
          handleLayout: this.handleLayout,
          handleSearch: this.handleSearch,
          platform: process.platform,
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
