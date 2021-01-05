import React, { Component } from 'react'
import { getLegendaryConfig } from '../helper';
import { Game, Installing } from '../types';
import ContextProvider from './ContextProvider';
const { ipcRenderer } = window.require('electron')

interface Props {
  children: React.ReactNode
}

interface StateProps {
  user: string
  data: Game[]
  installing: Installing[]
  playing: string[]
  refreshing: boolean
  error: boolean
}

export class GlobalState extends Component<Props> {
  state: StateProps = {
    user: '',
    data: [],
    installing: [],
    playing: [],
    refreshing: false,
    error: false
  }

  refresh = async (): Promise<void> => {
    console.log('refreshing');
    
    this.setState({refreshing: true})
    const { user, library } = await getLegendaryConfig()
    
    this.setState({
      user,
      refreshing: false,
      data: library
    })
  }

  handleInstalling = (value: string) => {
    const { installing } = this.state
    const isInstalling = installing.filter(({ game }) => game === value).length
    if (isInstalling) {
      const updatedInstalling = installing.filter(({ game }) => value !== game)
      this.setState({ installing: updatedInstalling })
    }
  
    this.setState({ installing: [...installing, { game: value, progress: '' }] })
    this.updateProgress(value)
  }

  updateProgress = (game: string) => {
    const { installing } = this.state
    ipcRenderer.send('requestGameProgress', (game))
    ipcRenderer.on('requestedOutput', (event: any, progress: Installing) => {
      return this.setState({
        installing: [ ...installing, {game, progress }]
      })
    })
 
  }

  componentDidMount(){
   this.refresh()
  }

  render() {
    const { children } = this.props;
    if (this.state.refreshing){
      return null
    }
    
    return (
        <ContextProvider.Provider
            value={{
              ...this.state,
              refresh: this.refresh,
              handleInstalling: this.handleInstalling
            }}
          >
          {children}    
        </ContextProvider.Provider>
    )
  }
}

export default GlobalState
