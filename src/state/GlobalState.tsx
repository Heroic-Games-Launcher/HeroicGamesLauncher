import React, { PureComponent } from 'react'
import Update from '../components/UI/Update'
import {
  getGameInfo,
  getLegendaryConfig,
  getProgress,
  legendary,
  notify,
} from '../helper'
import { Game, GameStatus, InstallProgress } from '../types'
import ContextProvider from './ContextProvider'
const storage: Storage = window.localStorage
const { remote, ipcRenderer } = window.require('electron')

const { BrowserWindow } = remote

interface Props {
  children: React.ReactNode
}

interface StateProps {
  user: string
  data: Game[]
  refreshing: boolean
  error: boolean
  filter: string
  filterText: string
  libraryStatus: GameStatus[]
}

export class GlobalState extends PureComponent<Props> {
  state: StateProps = {
    user: '',
    filterText: '',
    data: [],
    libraryStatus: [],
    refreshing: false,
    error: false,
    filter: 'all',
  }

  refresh = async (): Promise<void> => {
    this.setState({ refreshing: true })
    const { user, library } = await getLegendaryConfig()

    this.setState({
      user,
      refreshing: false,
      filterText: '',
      data: library,
    })
  }

  refreshLibrary = async (): Promise<void> => {
    this.setState({ refreshing: true })
    await legendary('list-games')
    this.refresh()
    notify(['Refreshing', 'Library was refreshed'])
  }

  handleSearch = (input: string) => this.setState({ filterText: input })
  handleFilter = (filter: string) => this.setState({ filter })

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
            currentApp.status === 'updating'
          )
        })
      default:
        return library
    }
  }

  handleGameStatus = async ({ appName, status, progress }: GameStatus) => {
    const { libraryStatus } = this.state
    const currentApp =
      libraryStatus.filter((game) => game.appName === appName)[0] || {}
    const currentWindow = BrowserWindow.getAllWindows()[0]
    const windowIsVisible = currentWindow.isVisible()
    const { title } = await getGameInfo(appName)

    if (currentApp && currentApp.status === status) {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      return this.setState({
        libraryStatus: [...updatedLibraryStatus, { ...currentApp, progress }],
      })
    }

    if (currentApp && currentApp.status === 'installing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )

      this.setState({ libraryStatus: updatedLibraryStatus })

      ipcRenderer.send('requestGameProgress', appName)
      ipcRenderer.on(
        `${appName}-progress`,
        (event: any, progress: InstallProgress) => {
          const percent = getProgress(progress)
          if (percent < 95) {
            notify([title, 'Installation Canceled'])

            if (windowIsVisible) {
              return this.refresh()
            }

            return currentWindow.reload()
          }
        }
      )

      notify([title, 'Has finished installing'])
      currentWindow.reload()
      return this.refresh()
    }

    if (currentApp && currentApp.status === 'updating' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })

      ipcRenderer.send('requestGameProgress', appName)
      ipcRenderer.on(
        `${appName}-progress`,
        (event: any, progress: InstallProgress) => {
          const percent = getProgress(progress)
          if (percent < 95) {
            notify([title, 'Updated Canceled'])

            if (windowIsVisible) {
              return this.refresh()
            }

            return currentWindow.reload()
          }
        }
      )

      notify([title, 'Has finished Updating'])
      return this.refresh()
    }

    if (currentApp && currentApp.status === 'repairing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })
      notify([title, 'Has finished Repairing'])

      if (windowIsVisible) {
        return this.refresh()
      }

      return currentWindow.reload()
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
      notify([title, 'Was uninstalled'])

      if (windowIsVisible) {
        return this.refresh()
      }

      return currentWindow.reload()
    }

    if (status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      return this.setState({ libraryStatus: updatedLibraryStatus })
    }

    return this.setState({
      libraryStatus: [...libraryStatus, { appName, status, progress }],
    })
  }

  componentDidMount() {
    const filter = storage.getItem('filter') || 'all'
    this.setState({ filter })
    this.refresh()
  }

  componentDidUpdate() {
    const { filter, libraryStatus } = this.state

    storage.setItem('filter', filter)
    const pendingOps = libraryStatus.filter((game) => game.status !== 'playing')
      .length
    if (pendingOps) {
      ipcRenderer.send('lock')
    } else {
      ipcRenderer.send('unlock')
    }
  }

  render() {
    const { children } = this.props
    const { data, filterText, filter, refreshing } = this.state

    if (refreshing) {
      return <Update />
    }

    const filterRegex = new RegExp(String(filterText), 'i')
    const textFilter = ({ title }: Game) => filterRegex.test(title)
    const filteredLibrary = this.filterLibrary(data, filter).filter(textFilter)

    return (
      <ContextProvider.Provider
        value={{
          ...this.state,
          data: filteredLibrary,
          refresh: this.refresh,
          refreshLibrary: this.refreshLibrary,
          handleGameStatus: this.handleGameStatus,
          handleFilter: this.handleFilter,
          handleSearch: this.handleSearch,
        }}
      >
        {children}
      </ContextProvider.Provider>
    )
  }
}

export default GlobalState
