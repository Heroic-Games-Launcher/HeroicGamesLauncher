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
import { TourProvider } from './state/TourContext'
import { useTranslation } from 'react-i18next'

function Root() {
  const {
    isSettingsModalOpen,
    isRTL,
    isFullscreen,
    isFrameless,
    experimentalFeatures,
    help,
    showDialogModal
  } = useContext(ContextProvider)

  const { t } = useTranslation()

  React.useEffect(() => {
    const storageKey = 'analytics-modal-shown'
    if (!localStorage.getItem(storageKey)) {
      showDialogModal({
        showDialog: true,
        title: t('analyticsModal.title', 'Help Improve Heroic'),
        message: t(
          'analyticsModal.message',
          "Heroic collects 100% anonymous data via the open-source Plausible Analytics platform. {{newline}} {{newline}} Heroic will never collect any info regarding your identity or usage patterns, nor games or username. If you feel uncomfortable with this, this can be disabled anytime in Heroic's settings.",
          { newline: '\n\n' }
        ),
        buttons: [
          {
            text: t('box.ok', 'OK'),
            onClick: () => {
              localStorage.setItem(storageKey, 'true')
              showDialogModal({ showDialog: false })
            }
          }
        ],
        type: 'MESSAGE'
      })
    }
  }, [showDialogModal])

  const hasNativeOverlayControls = navigator['windowControlsOverlay']?.visible
  const showOverlayControls = isFrameless && !hasNativeOverlayControls

  const theme = createTheme({
    direction: isRTL ? 'rtl' : 'ltr',
    components: {
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: 'var(--text-md)',
            backgroundColor: 'var(--background-darker)',
            color: 'var(--text-primary)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--space-sm)',
            maxWidth: '350px'
          }
        }
      }
    }
  })

  return (
    <div
      id="app"
      className={classNames('App', {
        isRTL,
        frameless: isFrameless,
        fullscreen: isFullscreen
      })}
      // disable dragging for all elements by default
      onDragStart={(e) => e.preventDefault()}
    >
      <ThemeProvider theme={theme}>
        <TourProvider>
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
            <div className="simple-keyboard"></div>
          </div>
          {showOverlayControls && <WindowControls />}
          {experimentalFeatures.enableHelp && <Help items={help.items} />}
        </TourProvider>
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
