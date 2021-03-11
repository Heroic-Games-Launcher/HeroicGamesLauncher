import React, { lazy, useContext } from 'react'

import './App.css'
import { Library } from './components/Library'
import { HashRouter, Switch, Route } from 'react-router-dom'
import ContextProvider from './state/ContextProvider'
import GamepadApi from './GamepadApi'
const { remote } = window.require('electron')
const { Notification } = remote

//Reconnect controller after closing a game
window.onfocus = () => {
  GamepadApi.disconnected && navigator.getGamepads()[0]
    ? GamepadApi.connect()
    : null
}
// Connect Controller
window.addEventListener('gamepadconnected', () => {
  window.focus()
  const gamepad = navigator.getGamepads()[0]

  if (gamepad) {
    new Notification({
      title: 'Gamepad Connected',
      body: `${gamepad.id}`,
    }).show()
    GamepadApi.connect()
  }
})

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

  const dlcCount = library.filter((lib) => lib.is_dlc)
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
