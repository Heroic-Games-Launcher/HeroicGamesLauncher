import React, { PureComponent } from 'react'
import Update from '../components/UI/Update'
import { getGameInfo, getLegendaryConfig, legendary, notify } from '../helper'
import { Game, GameStatus } from '../types'
import ContextProvider from './ContextProvider'
const storage: Storage = window.localStorage
const { remote } = window.require('electron')
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
    const currentProgress = currentApp?.progress ? currentApp.progress : 0
    const currentWindow = BrowserWindow.getAllWindows()[0]
    const windowIsVisible = currentWindow.isVisible()

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

      if (currentProgress < 95) {
        const { title } = await getGameInfo(appName)
        notify([title, 'Installation Canceled'])

        if (windowIsVisible) {
          return this.refresh()
        }

        return currentWindow.reload()
      }

      const { title } = await getGameInfo(appName)
      notify([title, 'Has finished installing'])
      currentWindow.reload()
      return this.refresh()
    }

    if (currentApp && currentApp.status === 'updating' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })

      if (currentProgress < 95) {
        const { title } = await getGameInfo(appName)
        notify([title, 'Updating Canceled'])

        if (windowIsVisible) {
          return this.refresh()
        }

        return currentWindow.reload()
      }

      const { title } = await getGameInfo(appName)
      notify([title, 'Has finished Updating'])
      return this.refresh()
    }

    if (currentApp && currentApp.status === 'repairing' && status === 'done') {
      const updatedLibraryStatus = libraryStatus.filter(
        (game) => game.appName !== appName
      )
      this.setState({ libraryStatus: updatedLibraryStatus })
      const { title } = await getGameInfo(appName)
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
      const { title } = await getGameInfo(appName)
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
    storage.setItem('filter', this.state.filter)
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
