import React, { useContext } from 'react'

import './App.css'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Login from './screens/Login'
import WebView from './screens/WebView'
import { GamePage } from './screens/Game'
import Library from './screens/Library'
import WineManager from './screens/WineManager'
import Sidebar from './components/UI/Sidebar'
import Settings from './screens/Settings'
import Accessibility from './screens/Accessibility'
import ContextProvider from './state/ContextProvider'
import classNames from 'classnames'
import { ControllerHints } from './components/UI'

function App() {
  const { epic, gog, contentFontFamily, actionsFontFamily, sidebarCollapsed } =
    useContext(ContextProvider)

  const style = {
    '--content-font-family': contentFontFamily,
    '--actions-font-family': actionsFontFamily
  } as React.CSSProperties

  const loggedIn = epic.username || gog.username

  return (
    <div
      className={classNames('App', { collapsed: sidebarCollapsed })}
      style={style}
    >
      <HashRouter>
        <Sidebar />
        <main className="content">
          <Routes>
            <Route path="/" element={loggedIn ? <Library /> : <Login />} />
            <Route path="login" element={<Login />} />
            <Route path="epicstore" element={<WebView />} />
            <Route path="gogstore" element={<WebView />} />
            <Route path="wiki" element={<WebView />} />
            <Route path="gamepage">
              <Route path=":runner">
                <Route path=":appName" element={<GamePage />} />
              </Route>
            </Route>
            <Route path="/store-page" element={<WebView />} />
            <Route path="loginweb">
              <Route path=":runner" element={<WebView />} />
            </Route>
            <Route path="settings">
              <Route path=":runner">
                <Route path=":appName">
                  <Route path=":type" element={<Settings />} />
                </Route>
              </Route>
            </Route>
            <Route path="/wine-manager" element={<WineManager />} />
            <Route path="/accessibility" element={<Accessibility />} />
          </Routes>
        </main>
        <div className="controller">
          <ControllerHints />
          <div className="simple-keyboard"></div>
        </div>
      </HashRouter>
    </div>
  )
}

export default App
