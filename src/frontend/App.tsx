import React, { useContext, lazy } from 'react'

import './App.css'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/UI/Sidebar'
import ContextProvider from './state/ContextProvider'
import classNames from 'classnames'
import { ControllerHints, OfflineMessage } from './components/UI'
import DialogHandler from './components/UI/DialogHandler'
import Library from './screens/Library'

const Settings = lazy(async () => import('./screens/Settings'))
const Accessibility = lazy(async () => import('./screens/Accessibility'))
const DownloadManager = lazy(async () => import('./screens/DownloadManager'))
const WineManager = lazy(async () => import('./screens/WineManager'))
const GamePage = lazy(async () => import('./screens/Game/GamePage'))
const WebView = lazy(async () => import('./screens/WebView'))
const Login = lazy(async () => import('./screens/Login'))

function App() {
  const { sidebarCollapsed } = useContext(ContextProvider)

  return (
    <div className={classNames('App', { collapsed: sidebarCollapsed })}>
      <HashRouter>
        <OfflineMessage />
        <Sidebar />
        <main className="content">
          <DialogHandler />
          <Routes>
            <Route path="/" element={<Navigate replace to="/library" />} />
            <Route path="/library" element={<Library />} />
            <Route path="login" element={<Login />} />
            <Route path="epicstore" element={<WebView />} />
            <Route path="gogstore" element={<WebView />} />
            <Route path="wiki" element={<WebView />} />
            <Route path="/gamepage">
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
            <Route path="/download-manager" element={<DownloadManager />} />
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
