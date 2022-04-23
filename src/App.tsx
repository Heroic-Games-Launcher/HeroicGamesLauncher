import React, { lazy, useContext } from 'react'

import './App.css'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { Library } from 'src/screens/Library'
import ContextProvider from 'src/state/ContextProvider'
import Sidebar from 'src/components/UI/Sidebar'
import Login from './screens/Login'
import WebView from './screens/WebView'

import { configStore, gogConfigStore } from './helpers/electron_stores'

const Settings = lazy(() => import('./screens/Settings'))
const GamePage = lazy(() => import('./screens/Game/GamePage'))
const Header = lazy(() => import('./components/UI/Header'))
const WineManager = lazy(() => import('./screens/WineManager'))

function App() {
  const { epicLibrary, gogLibrary, recentGames, category } =
    useContext(ContextProvider)

  const user = configStore.has('userInfo') || gogConfigStore.has('credentials')

  const dlcCount = epicLibrary.filter((lib) => lib.install.is_dlc)
  const numberOfGames =
    category == 'epic'
      ? epicLibrary.length - dlcCount.length
      : gogLibrary.length
  const showRecentGames = !!recentGames.length && category !== 'unreal'
  return (
    <div className="App">
      <HashRouter>
        <Sidebar />
        <main className="content">
          <Switch>
            <Route exact path="/">
              {user && (
                <>
                  <Header numberOfGames={numberOfGames} />
                  <div className="listing">
                    <span id="top" />
                    {showRecentGames && (
                      <Library showRecentsOnly library={recentGames} />
                    )}
                    <Library
                      library={category === 'epic' ? epicLibrary : gogLibrary}
                    />
                  </div>
                </>
              )}
            </Route>
            <Route exact path="/login" component={Login} />
            <Route exact path="/epicstore" component={WebView} />
            <Route exact path="/gogstore" component={WebView} />
            <Route exact path="/wiki" component={WebView} />
            <Route exact path="/gameconfig/:appName" component={GamePage} />
            <Route path="/store-page" component={WebView} />
            <Route path="/login/:runner" component={WebView} />
            <Route path="/settings/:appName/:type" component={Settings} />
            <Route path="/wine-manager" component={WineManager} />
          </Switch>
        </main>
      </HashRouter>
    </div>
  )
}

export default App
