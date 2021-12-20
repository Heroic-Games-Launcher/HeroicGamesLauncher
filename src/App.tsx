import React, { lazy, useContext } from 'react'

import './App.css'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { Library } from 'src/screens/Library'
import ContextProvider from 'src/state/ContextProvider'
import ElectronStore from 'electron-store'
import Sidebar from 'src/components/UI/Sidebar'
import Login from './screens/Login'
import WebView from './screens/WebView'

const Store = window.require('electron-store')

const Settings = lazy(() => import('./screens/Settings'))
const GamePage = lazy(() => import('./screens/Game/GamePage'))
const Header = lazy(() => import('./components/UI/Header'))
const WineGE = lazy(() => import('./screens/WineGE'))

function App() {
  const context = useContext(ContextProvider)
  const configStore: ElectronStore = new Store({
    cwd: 'store'
  })
  const user = configStore.get('userInfo')
  const { data: library, refresh, recentGames, category } = context

  const dlcCount = library.filter((lib) => lib.install.is_dlc)
  const numberOfGames = library.length - dlcCount.length
  const showRecentGames = !!recentGames.length && category === 'games'

  return (
    <div className="App">
      <HashRouter>
        <Sidebar />
        <main className="content">
          <Switch>
            <Route exact path="/">
              {user ? (
                <>
                  <Header
                    goTo={''}
                    renderBackButton={false}
                    numberOfGames={numberOfGames}
                  />
                  {showRecentGames && (
                    <Library showRecentsOnly library={recentGames} />
                  )}
                  <Library library={library} />
                </>
              ) : (
                <Login refresh={refresh} />
              )}
            </Route>
            <Route exact path="/epicstore" component={WebView} />
            <Route exact path="/wiki" component={WebView} />
            <Route exact path="/gameconfig/:appName" component={GamePage} />
            <Route path="/settings/:appName/:type" component={Settings} />
            <Route path="/wine-ge" component={WineGE}/>
          </Switch>
        </main>
      </HashRouter>
    </div>
  )
}

export default App
