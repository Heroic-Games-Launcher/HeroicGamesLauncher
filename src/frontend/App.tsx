import React, { useContext } from 'react'

import './App.css'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './screens/Login'
import WebView from './screens/WebView'
import { GamePage } from './screens/Game'
import Library from './screens/Library'
import WineManager from './screens/WineManager'
import Sidebar from './components/UI/Sidebar'
import Settings from './screens/Settings'
import Accessibility from './screens/Accessibility'
import ContextProvider from './state/ContextProvider'
import { ControllerHints, Help, OfflineMessage } from './components/UI'
import DownloadManager from './screens/DownloadManager'
import DialogHandler from './components/UI/DialogHandler'
import SettingsModal from './screens/Settings/components/SettingsModal'
import ExternalLinkDialog from './components/UI/ExternalLinkDialog'
import WindowControls from './components/UI/WindowControls'
import classNames from 'classnames'

function App() {
  const {
    isSettingsModalOpen,
    isRTL,
    isFullscreen,
    isFrameless,
    experimentalFeatures,
    help
  } = useContext(ContextProvider)

  const hasNativeOverlayControls = navigator['windowControlsOverlay']?.visible
  const showOverlayControls = isFrameless && !hasNativeOverlayControls

  return (
    <div
      id="app"
      className={classNames('App', {
        isRTL,
        frameless: isFrameless,
        fullscreen: isFullscreen,
        oldDesign: !experimentalFeatures.enableNewDesign
      })}
      // disable dragging for all elements by default
      onDragStart={(e) => e.preventDefault()}
    >
      <HashRouter>
        <OfflineMessage />
        <Sidebar />
        <main className="content">
          <DialogHandler />
          {isSettingsModalOpen.gameInfo && (
            <SettingsModal
              gameInfo={isSettingsModalOpen.gameInfo}
              type={isSettingsModalOpen.type}
            />
          )}
          <ExternalLinkDialog />
          <Routes>
            <Route path="/" element={<Navigate replace to="/library" />} />
            <Route path="/library" element={<Library />} />
            <Route path="login" element={<Login />} />
            <Route path="epicstore" element={<WebView store="epic" />} />
            <Route path="gogstore" element={<WebView store="gog" />} />
            <Route path="amazonstore" element={<WebView store="amazon" />} />
            <Route path="wiki" element={<WebView />} />
            <Route path="/gamepage">
              <Route path=":runner">
                <Route path=":appName" element={<GamePage />} />
              </Route>
            </Route>
            <Route path="/store-page" element={<WebView />} />
            <Route path="/last-url" element={<WebView />} />
            <Route path="loginweb">
              <Route path=":runner" element={<WebView />} />
            </Route>
            <Route path="settings">
              <Route path=":type" element={<Settings />} />
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
        {showOverlayControls && <WindowControls />}
        {experimentalFeatures.enableHelp && <Help items={help.items} />}
      </HashRouter>
    </div>
  )
}

export default App
