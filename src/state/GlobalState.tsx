import React, { Component } from 'react'
import { getLegendaryConfig } from '../helper';
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
    const isInstalling = installing.includes(value)
  
    if (isInstalling) {
      const updatedInstalling = installing.filter(game => game !== value)
      return this.setState({ installing: updatedInstalling })
    }
  
    return this.setState({ installing: [...installing, value] })
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
