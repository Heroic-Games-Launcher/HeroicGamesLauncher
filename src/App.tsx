import React, { lazy, useContext } from 'react'

import './App.css'
import './themes.css'
import { HashRouter, Route, Switch } from 'react-router-dom'
import Sidebar from 'src/components/UI/Sidebar'
import Login from './screens/Login'
import WebView from './screens/WebView'
import ContextProvider from './state/ContextProvider'

const Library = lazy(() => import('./screens/Library'))
const Settings = lazy(() => import('./screens/Settings'))
const GamePage = lazy(() => import('./screens/Game/GamePage'))
const WineManager = lazy(() => import('./screens/WineManager'))

function App() {
  const { theme } = useContext(ContextProvider)

  return (
    <div className={`App ${theme}`}>
      <HashRouter>
        <Sidebar />
        <main className="content">
          <Switch>
            <Route exact path="/" component={Library} />
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
