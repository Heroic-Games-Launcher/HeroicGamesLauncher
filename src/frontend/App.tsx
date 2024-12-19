import React, { useContext } from 'react'

import './App.css'
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider
} from 'react-router-dom'
import Sidebar from './components/UI/Sidebar'
import ContextProvider from './state/ContextProvider'
import { ControllerHints, Help, OfflineMessage } from './components/UI'
import DialogHandler from './components/UI/DialogHandler'
import SettingsModal from './screens/Settings/components/SettingsModal'
import ExternalLinkDialog from './components/UI/ExternalLinkDialog'
import WindowControls from './components/UI/WindowControls'
import classNames from 'classnames'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import LogFileUploadDialog from './components/UI/LogFileUploadDialog'
import UploadedLogFilesList from './screens/Settings/sections/LogSettings/components/UploadedLogFilesList'

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

  const theme = createTheme({
    direction: isRTL ? 'rtl' : 'ltr'
  })

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
      <ThemeProvider theme={theme}>
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
          <LogFileUploadDialog />
          <UploadedLogFilesList />
          <Outlet />
        </main>
        <div className="controller">
          <ControllerHints />
          <dialog className="simple-keyboard-wrapper">
            <div className="simple-keyboard"></div>
          </dialog>
        </div>
        {showOverlayControls && <WindowControls />}
        {experimentalFeatures.enableHelp && <Help items={help.items} />}
      </ThemeProvider>
    </div>
  )
}

function makeLazyFunc(
  importedFile: Promise<Record<'default', React.ComponentType>>
) {
  return async () => {
    const component = await importedFile
    return { Component: component.default }
  }
}

const router = createHashRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        lazy: makeLazyFunc(import('./screens/Library'))
      },
      {
        path: 'login',
        lazy: makeLazyFunc(import('./screens/Login'))
      },
      {
        path: 'store/:store',
        lazy: makeLazyFunc(import('./screens/WebView'))
      },
      {
        path: 'wiki',
        lazy: makeLazyFunc(import('./screens/WebView'))
      },
      {
        path: 'gamepage/:runner/:appName',
        lazy: makeLazyFunc(import('./screens/Game/GamePage'))
      },
      {
        path: 'store-page',
        lazy: makeLazyFunc(import('./screens/WebView'))
      },
      {
        path: 'loginweb/:runner',
        lazy: makeLazyFunc(import('./screens/WebView'))
      },
      {
        path: 'settings/:type',
        lazy: makeLazyFunc(import('./screens/Settings'))
      },
      {
        path: 'wine-manager',
        lazy: makeLazyFunc(import('./screens/WineManager'))
      },
      {
        path: 'download-manager',
        lazy: makeLazyFunc(import('./screens/DownloadManager'))
      },
      {
        path: 'accessibility',
        lazy: makeLazyFunc(import('./screens/Accessibility'))
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
