import React, { Component } from 'react'
import Update from '../components/UI/Update';
import { getLegendaryConfig, legendary } from '../helper';
import { Game } from '../types';
import ContextProvider from './ContextProvider';

interface Props {
  children: React.ReactNode
}

interface StateProps {
  user: string
  data: Game[]
  installing: string[]
  playing: string[]
  refreshing: boolean
  error: boolean
  onlyInstalled: boolean
  filterText: string
}

export class GlobalState extends Component<Props> {
  state: StateProps = {
    user: '',
    filterText: '',
    data: [],
    installing: [],
    playing: [],
    refreshing: false,
    error: false,
    onlyInstalled: false
  }
  
  refresh = async (): Promise<void> => {
    this.setState({refreshing: true})
    const { user, library } = await getLegendaryConfig()
    
    this.setState({
      user,
      refreshing: false,
      data: library
    })
  }

  refreshLibrary = async(): Promise<void> => {
    this.setState({refreshing: true})
    await legendary('list-games')
    this.refresh()
  }

  handleSearch = (input: string) => this.setState({filterText: input})
  handleOnlyInstalled = () => this.setState({onlyInstalled: !this.state.onlyInstalled})

  handleInstalling = (value: string) => {
    const { installing } = this.state
    const isInstalling = installing.includes(value)
    
    if (isInstalling) {
      const updatedInstalling = installing.filter(game => game !== value)

      return this.setState({ installing: updatedInstalling })
    }
  
    return this.setState({ installing: [...installing, value] })
  }

  handlePlaying = (value: string) => {
    const { playing } = this.state
    const isPlaying = playing.includes(value)
  
    if (isPlaying) {
      const updatedPlaying = playing.filter(game => game !== value)
      return this.setState({ playing: updatedPlaying })
    }
  
    return this.setState({ playing: [...playing, value] })
  }

  componentDidMount(){
   this.refresh()
  }

  render() {
    const { children } = this.props;
    const { data, filterText, onlyInstalled, refreshing } = this.state

    if (refreshing){
      return <Update />
    }

    const filterRegex: RegExp = new RegExp(String(filterText), 'i')
    const textFilter = ({ title }: Game) => filterRegex.test(title)
    const installedFilter = (game: Game) => onlyInstalled ? game.isInstalled : true
    const filteredLibrary =  data.filter(installedFilter).filter(textFilter)
    
    return (
        <ContextProvider.Provider
            value={{
              ...this.state,
              data: filteredLibrary,
              refresh: this.refresh,
              refreshLibrary: this.refreshLibrary,
              handleInstalling: this.handleInstalling,
              handlePlaying: this.handlePlaying,
              handleOnlyInstalled: this.handleOnlyInstalled,
              handleSearch: this.handleSearch,
            }}
          >
          {children}    
        </ContextProvider.Provider>
    )
  }
}

export default GlobalState
