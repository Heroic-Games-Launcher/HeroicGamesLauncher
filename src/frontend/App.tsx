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
import ExternalLinkDialog from './components/UI/ExternalLinkDialog'
import WindowControls from './components/UI/WindowControls'
import classNames from 'classnames'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import LogFileUploadDialog from './components/UI/LogFileUploadDialog'
import UploadedLogFilesList from './screens/Settings/sections/LogSettings/components/UploadedLogFilesList'
import { TourProvider } from './state/TourContext'
import { InstallGameWrapper } from './screens/Library/components/InstallModal'
import { SettingsModalWrapper } from './screens/Settings/components/SettingsModal'
import { useTranslation } from 'react-i18next'

function Root() {
  const {
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
        title: t('analyticsModal.title', 'Send Anonymous Analytics'),
        message: (
          <>
            {t(
              'analyticsModal.info.pt1',
              'In order to improve the app, Heroic collects 100% anonymous data.'
            )}
            <ul>
              <li>
                {t(
                  'analyticsModal.info.pt2',
                  'Heroic uses the open-source Plausible Analytics platform to gather basic data like: App Version, OS, Stores and Country.'
                )}
              </li>
              <li>
                {t(
                  'analyticsModal.info.pt3',
                  'It will never collect any personal information, including your username, IP address or email.'
                )}
              </li>
              <li>
                {t(
                  'analyticsModal.info.pt4',
                  'This data is used to gives insights on what to focus on next due to our limited resources and user feedback.'
                )}
              </li>
              <li>
                {t(
                  'analyticsModal.info.pt5',
                  'Plausible Analytics is fully compliant with GDPR, CCPA and PECR.'
                )}
              </li>
            </ul>
            {t(
              'analyticsModal.info.pt6',
              'You can change this setting at any time in the App Settings.'
            )}
          </>
        ),
        buttons: [
          {
            text: t('box.ok', 'OK'),
            onClick: () => {
              localStorage.setItem(storageKey, 'true')
              showDialogModal({ showDialog: false })
            }
          },
          {
            text: t('analyticsModal.disable', 'Disable Analytics'),
            onClick: () => {
              localStorage.setItem(storageKey, 'true')
              window.api.setSetting({
                appName: 'default',
                key: 'analyticsOptIn',
                value: false
              })
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
            <InstallGameWrapper />
            <SettingsModalWrapper />
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
