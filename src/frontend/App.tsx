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
import { ControllerHints, OfflineMessage } from './components/UI'
import DownloadManager from './screens/DownloadManager'
import DialogHandler from './components/UI/DialogHandler'
import SettingsModal from './screens/Settings/components/SettingsModal'
import ExternalLinkDialog from './components/UI/ExternalLinkDialog'

function App() {
  const { isSettingsModalOpen } = useContext(ContextProvider)

  return (
    <div id="app" className="App">
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
            <Route
              path="epicstore"
              element={
                <WebView
                  identifier="epicstore"
                  initialURL="https://epicgames.com/"
                />
              }
            />
            <Route
              path="gogstore"
              element={
                <WebView identifier="gogstore" initialURL="https://gog.com/" />
              }
            />
            <Route
              path="wiki"
              element={
                <WebView
                  identifier="wiki"
                  initialURL="https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki"
                />
              }
            />
            <Route path="/gamepage">
              <Route path=":runner">
                <Route path=":appName" element={<GamePage />} />
              </Route>
            </Route>
            <Route
              path="/store-page"
              element={
                <WebView
                  identifier="store-page"
                  initialURL="https://www.epicgames.com/store"
                />
              }
            />
            <Route path="loginweb">
              <Route
                path="epic"
                element={
                  <WebView
                    identifier="loginweb-epic"
                    initialURL="https://legendary.gl/epiclogin"
                  />
                }
              />
              <Route
                path="gog"
                element={
                  <WebView
                    identifier="loginweb-gog"
                    initialURL="https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy"
                  />
                }
              />
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
