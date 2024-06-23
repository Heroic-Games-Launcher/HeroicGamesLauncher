import React, { PureComponent } from 'react'

import ContextProvider from './ContextProvider'

interface Props {
  children: React.ReactNode
}

class GlobalState extends PureComponent<Props> {
  async componentDidMount() {
    window.api.frontendReady()
  }

  render() {
    return (
      <ContextProvider.Provider value={{}}>
        {this.props.children}
      </ContextProvider.Provider>
    )
  }
}

export default GlobalState
