import React, { lazy } from 'react'

import './App.css'
import { HashRouter, Route, Switch } from 'react-router-dom'
import Sidebar from 'src/components/UI/Sidebar'
import Login from './screens/Login'
import WebView from './screens/WebView'

const Library = lazy(() => import('./screens/Library'))
const Settings = lazy(() => import('./screens/Settings'))
const GamePage = lazy(() => import('./screens/Game/GamePage'))
const WineManager = lazy(() => import('./screens/WineManager'))

function App() {
  return (
    <div className="App">
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
