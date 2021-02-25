import React, { lazy, useContext } from 'react'

import './App.css'
import { Library } from './components/Library'
import { HashRouter, Switch, Route } from 'react-router-dom'
import ContextProvider from './state/ContextProvider'

const NavBar = lazy(() => import('./components/NavBar'))
const Settings = lazy(() => import('./components/Settings'))
const GamePage = lazy(() => import('./components/GamePage/GamePage'))
const Header = lazy(() => import('./components/UI/Header'))
const Login = lazy(() => import('./components/Login'))

function App() {
  const context = useContext(ContextProvider)

  const { user, data: library, refresh, handleFilter, handleLayout } = context

  if (!user && !library.length) {
    return <Login refresh={refresh} />
  }

  const dlcCount = library.filter(lib => lib.is_dlc)
  const numberOfGames = library.length - dlcCount.length
  return (
    <div className="App">
      <HashRouter>
        <NavBar />
        <Switch>
          <Route exact path="/">
            <div className="content">
              <Header
                goTo={''}
                renderBackButton={false}
                handleFilter={handleFilter}
                numberOfGames={numberOfGames}
                handleLayout={handleLayout}
              />
              <div id="top"></div>
              <Library library={library} />
            </div>
          </Route>
          <Route exact path="/gameconfig/:appName" component={GamePage} />
          <Route path="/settings/:appName/:type" component={Settings} />
        </Switch>
      </HashRouter>
    </div>
  )
}

export default App
