import React, { lazy, useContext } from 'react'

import './App.css'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { Library } from './screens/Library'
import ContextProvider from './state/ContextProvider'
import ElectronStore from 'electron-store'
import Login from './screens/Login'

const Store = window.require('electron-store')
const configStore: ElectronStore = new Store({
  cwd: 'store'
})

const NavBar = lazy(() => import('./components/Navbar'))
const Settings = lazy(() => import('./screens/Settings'))
const GamePage = lazy(() => import('./screens/Game/GamePage'))
const Header = lazy(() => import('./components/UI/Header'))
const WineGE = lazy(() => import('./screens/WineGE'))

function App() {
  const context = useContext(ContextProvider)
  const user = configStore.get('userInfo')
  const { data: library, refresh } = context

  if (!user) {
    return <Login refresh={refresh} />
  }

  const dlcCount = library.filter((lib) => lib.install.is_dlc)
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
                numberOfGames={numberOfGames}
              />
              <div id="top"></div>
              <Library library={library} />
            </div>
          </Route>
          <Route exact path="/gameconfig/:appName" component={GamePage} />
          <Route path="/settings/:appName/:type" component={Settings} />
          <Route path="/wine-ge" component={WineGE}/>
        </Switch>
      </HashRouter>
    </div>
  )
}

export default App
