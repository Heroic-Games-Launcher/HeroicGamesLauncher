import React, { useContext } from 'react'

import './App.css'
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider
} from 'react-router-dom'
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

function Root() {
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
        <Outlet />
      </main>
      <div className="controller">
        <ControllerHints />
        <div className="simple-keyboard"></div>
      </div>
      {showOverlayControls && <WindowControls />}
      {experimentalFeatures.enableHelp && <Help items={help.items} />}
    </div>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        Component: Library
      },
      {
        path: 'login',
        Component: Login
      },
      {
        path: 'store/:store',
        Component: WebView
      },
      {
        path: 'wiki',
        Component: WebView
      },
      {
        path: 'gamepage/:runner/:appName',
        Component: GamePage
      },
      {
        path: 'store-page',
        Component: WebView
      },
      {
        path: 'loginweb/:runner',
        Component: WebView
      },
      {
        path: 'settings/:runner/:appName/:type',
        Component: Settings
      },
      {
        path: 'wine-manager',
        Component: WineManager
      },
      {
        path: 'download-manager',
        Component: DownloadManager
      },
      {
        path: 'accessibility',
        Component: Accessibility
      },
      {
        path: '*',
        element: <Navigate replace to="/" />
      }
    ]
  }
])

export default function App() {
  return <RouterProvider router={router} />
}
