import React, { useContext } from 'react'

import './App.css'
import { Library } from './components/Library'
import Login from './components/Login'
import { HashRouter, Switch, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Settings from './components/Settings'
import GamePage from './components/GamePage/GamePage'
import Header from './components/UI/Header'
import ContextProvider from './state/ContextProvider'

function App() {
  const context = useContext(ContextProvider)

  const { user, data: library, refresh, handleFilter } = context

  if (!user && !library.length) {
    return <Login refresh={refresh} />
  }

  const numberOfGames = library.length

  return (
    <div className="App">
      <HashRouter>
        <NavBar />
        <Switch>
          <Route exact path="/">
            <Header
              goTo={''}
              renderBackButton={false}
              handleFilter={handleFilter}
              numberOfGames={numberOfGames}
            />
            <Library library={library} />
          </Route>
          <Route exact path="/gameconfig/:appName" component={GamePage} />
          <Route path="/settings/:appName/:type" component={Settings} />
        </Switch>
      </HashRouter>
    </div>
  )
}

export default App
