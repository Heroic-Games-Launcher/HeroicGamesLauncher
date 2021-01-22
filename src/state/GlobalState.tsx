import React, { PureComponent } from 'react'
import Update from '../components/UI/Update'
import { getGameInfo, getLegendaryConfig, legendary, notify } from '../helper'
import { Game, PlayStatus } from '../types'
import ContextProvider from './ContextProvider'

interface Props {
  children: React.ReactNode
}

interface StateProps {
  user: string
  data: Game[]
  installing: string[]
  playing: PlayStatus[]
  refreshing: boolean
  error: boolean
  filter: string
  filterText: string
}

export class GlobalState extends PureComponent<Props> {
  state: StateProps = {
    user: '',
    filterText: '',
    data: [],
    installing: [],
    playing: [],
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
        return library.filter((game) =>
          this.state.installing.includes(game.app_name)
        )
      default:
        return library
    }
  }

  handleInstalling = async (value: string) => {
    const { installing } = this.state
    const isInstalling = installing.includes(value)

    if (isInstalling) {
      const updatedInstalling = installing.filter((game) => game !== value)
      this.setState({ installing: updatedInstalling })
      const { title } = await getGameInfo(value)
      notify([title, 'Has finished installing'])
      return this.refresh()
    }

    return this.setState({ installing: [...installing, value] })
  }

  handlePlaying = ({ appName, status }: PlayStatus) => {
    const { playing } = this.state

    if (status === false) {
      const updatedPlaying = playing.filter((game) => game.appName !== appName)
      return this.setState({ playing: updatedPlaying })
    }

    const currentStatus = playing.filter((game) => game.appName === appName)[0]
      ?.status

    if (currentStatus === status) {
      return
    }

    return this.setState({ playing: [...playing, { appName, status }] })
  }

  componentDidMount() {
    this.refresh()
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
          handleInstalling: this.handleInstalling,
          handlePlaying: this.handlePlaying,
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
