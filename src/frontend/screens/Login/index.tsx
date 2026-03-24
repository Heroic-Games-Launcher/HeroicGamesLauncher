import React, { useContext, useEffect, useState } from 'react'
import './index.scss'
import Runner from './components/Runner'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import EpicLogo from 'frontend/assets/epic-logo.svg?react'
import GOGLogo from 'frontend/assets/gog-logo.svg?react'
import HeroicLogo from 'frontend/assets/heroic-icon.svg?react'
import AmazonLogo from 'frontend/assets/amazon-logo.svg?react'
import ZoomLogo from 'frontend/assets/zoom-logo.svg?react'
import EALogo from 'frontend/assets/ea-logo.svg?react'
import UbisoftLogo from 'frontend/assets/ubisoft-logo.svg?react'
import BattlenetLogo from 'frontend/assets/battlenet-logo.svg?react'

import { LanguageSelector, UpdateComponent } from '../../components/UI'
import { FlagPosition } from '../../components/UI/LanguageSelector'
import SIDLogin from './components/SIDLogin'
import ContextProvider from '../../state/ContextProvider'
import { useAwaited } from '../../hooks/useAwaited'
import { hasHelp } from 'frontend/hooks/hasHelp'
import ThirdPartyLauncherInstaller from './components/ThirdPartyLauncherInstaller'
import ThirdPartyLauncherInstallerDialog from './components/ThirdPartyLauncherInstallerDialog'
import { Dialog } from 'frontend/components/UI/Dialog'
import { ThirdPartyLaunchers, WineInstallation, GameStatus } from 'common/types'

export const epicLoginPath = '/loginweb/legendary'
export const gogLoginPath = '/loginweb/gog'
export const amazonLoginPath = '/loginweb/nile'
export const zoomLoginPath = '/loginweb/zoom'

export default React.memo(function NewLogin() {
  const { epic, gog, amazon, zoom, refreshLibrary, showDialogModal } =
    useContext(ContextProvider)
  const { t } = useTranslation()

  hasHelp(
    'login',
    t('help.title.login', 'Login'),
    <p>{t('help.content.login', 'Log in into the different stores.')}</p>
  )

  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showSidLogin, setShowSidLogin] = useState(false)
  const [isEpicLoggedIn, setIsEpicLoggedIn] = useState(Boolean(epic.username))
  const [isGogLoggedIn, setIsGogLoggedIn] = useState(Boolean(gog.username))
  const [isAmazonLoggedIn, setIsAmazonLoggedIn] = useState(
    Boolean(amazon.user_id)
  )
  const [isZoomLoggedIn, setIsZoomLoggedIn] = useState(Boolean(zoom.username))
  const [showInstallerDialog, setShowInstallerDialog] = useState<{
    id: string
    name: string
  } | null>(null)
  const [launcherStatuses, setLauncherStatuses] = useState<Record<string, GameStatus>>({})

  useEffect(() => {
    const unsubscribe = window.api.handleGameStatus((_, status) => {
      if (status.appName.startsWith('sideload-')) {
        const id = status.appName.split('-')[1]
        setLauncherStatuses((prev) => ({ ...prev, [id]: status }))

        if (status.status === 'error') {
          showDialogModal({
            showDialog: true,
            title: t('install.failed', 'Installation failed'),
            message: status.context || 'Unknown error',
            type: 'ERROR'
          })
        }
      }
    })
    return () => {
      unsubscribe()
    }
  }, [t, showDialogModal])

  const systemInfo = useAwaited(window.api.systemInfo.get)

  let oldMac = false
  let oldMacMessage = ''
  if (systemInfo?.OS.platform === 'darwin') {
    const version = parseInt(systemInfo.OS.version.split('.')[0])
    if (version < 12) {
      oldMac = true
      oldMacMessage = t(
        'login.old-mac',
        'Your macOS version is {{version}}. macOS 12 or newer is required to log in.',
        { version: systemInfo.OS.version }
      )
    }
  }

  const loginMessage = t(
    'login.message',
    'Login with your platform. You can login to more than one platform at the same time.'
  )

  useEffect(() => {
    setLoading(false)
  }, [epic, gog])

  useEffect(() => {
    setIsEpicLoggedIn(Boolean(epic.username))
    setIsGogLoggedIn(Boolean(gog.username))
    setIsAmazonLoggedIn(Boolean(amazon.user_id))
    setIsZoomLoggedIn(Boolean(zoom.username))
  }, [epic.username, gog.username, amazon.user_id, zoom.username, t])

  async function handleLibraryClick() {
    await refreshLibrary({ runInBackground: false })
    navigate('/')
  }

  async function handleInstallLauncher(
    launcherId: ThirdPartyLaunchers,
    options: {
      winePrefix: string
      wineVersion: WineInstallation
      crossoverBottle?: string
    }
  ) {
    const result = await window.api.installThirdPartyLauncher({
      launcherId,
      options
    })
    if (result.success) {
      await refreshLibrary({ library: 'sideload', runInBackground: true })
    } else {
      window.api.logError(`Failed to install ${launcherId}: ${result.error}`)
    }
  }

  if (loading) {
    return <UpdateComponent />
  }

  return (
    <div className="loginPage">
      {showSidLogin && (
        <SIDLogin
          backdropClick={() => {
            setShowSidLogin(false)
          }}
        />
      )}
      <div className="loginBackground"></div>

      <div className="loginContentWrapper">
        <div className="runnerList">
          <div className="runnerHeader">
            <HeroicLogo className="runnerHeaderIcon" />
            <div className="runnerHeaderText">
              <h1 className="title">Heroic</h1>
              <h2 className="subtitle">Games Launcher</h2>
            </div>

            {!loading && (
              <LanguageSelector
                flagPossition={FlagPosition.PREPEND}
                showWeblateLink={true}
              />
            )}
          </div>

          <p className="runnerMessage">{loginMessage}</p>
          {oldMac && <p className="disabledMessage">{oldMacMessage}</p>}

          <div className="runnerGroup">
            <Runner
              class="epic"
              buttonText={t('login.epic', 'Epic Games Login')}
              loginUrl={epicLoginPath}
              icon={() => <EpicLogo />}
              isLoggedIn={isEpicLoggedIn}
              user={epic.username}
              logoutAction={epic.logout}
              alternativeLoginAction={() => {
                setShowSidLogin(true)
              }}
              disabled={oldMac}
            />
            <Runner
              class="gog"
              buttonText={t('login.gog', 'GOG Login')}
              icon={() => <GOGLogo />}
              loginUrl={gogLoginPath}
              isLoggedIn={isGogLoggedIn}
              user={gog.username}
              logoutAction={gog.logout}
              disabled={oldMac}
            />
            <Runner
              class="nile"
              buttonText={t('login.amazon', 'Amazon Login')}
              icon={() => <AmazonLogo />}
              loginUrl={amazonLoginPath}
              isLoggedIn={isAmazonLoggedIn}
              user={amazon.username || 'Unknown'}
              logoutAction={amazon.logout}
              disabled={oldMac}
            />
            {zoom.enabled && (
              <Runner
                class="zoom"
                buttonText={t('login.zoom', 'Zoom Login')}
                icon={() => <ZoomLogo />}
                loginUrl={zoomLoginPath}
                isLoggedIn={isZoomLoggedIn}
                user={zoom.username}
                logoutAction={zoom.logout}
                disabled={oldMac}
              />
            )}
          </div>

          <h3 className="runnerGroupTitle">
            {t('login.install_launchers', 'Install Other Launchers')}
          </h3>
          <div className="runnerGroup">
            <ThirdPartyLauncherInstaller
              id="ea"
              name="EA App"
              buttonText={t('login.install_ea', 'Install EA App')}
              icon={() => <EALogo />}
              onInstall={() =>
                setShowInstallerDialog({ id: 'ea', name: 'EA App' })
              }
              onCancel={(id) => window.api.cancelThirdPartyLauncherInstall(id)}
              status={launcherStatuses['ea']}
              disabled={oldMac}
            />
            <ThirdPartyLauncherInstaller
              id="ubisoft"
              name="Ubisoft Connect"
              buttonText={t('login.install_ubisoft', 'Install Ubisoft Connect')}
              icon={() => <UbisoftLogo />}
              onInstall={() =>
                setShowInstallerDialog({
                  id: 'ubisoft',
                  name: 'Ubisoft Connect'
                })
              }
              onCancel={(id) => window.api.cancelThirdPartyLauncherInstall(id)}
              status={launcherStatuses['ubisoft']}
              disabled={oldMac}
            />
            <ThirdPartyLauncherInstaller
              id="battlenet"
              name="Battle.net"
              buttonText={t('login.install_battlenet', 'Install Battle.net')}
              icon={() => <BattlenetLogo />}
              onInstall={() =>
                setShowInstallerDialog({ id: 'battlenet', name: 'Battle.net' })
              }
              onCancel={(id) => window.api.cancelThirdPartyLauncherInstall(id)}
              status={launcherStatuses['battlenet']}
              disabled={oldMac}
            />
          </div>
        </div>
        <button
          onClick={async () => handleLibraryClick()}
          className="goToLibrary"
        >
          {t('button.go_to_library', 'Go to Library')}
        </button>
      </div>

      {showInstallerDialog && (
        <div className="InstallModal">
          <Dialog
            onClose={() => setShowInstallerDialog(null)}
            showCloseButton
            className="InstallModal__dialog"
          >
            <ThirdPartyLauncherInstallerDialog
              launcherId={showInstallerDialog.id as ThirdPartyLaunchers}
              launcherName={showInstallerDialog.name}
              onClose={() => setShowInstallerDialog(null)}
              onInstall={(options) =>
                handleInstallLauncher(
                  showInstallerDialog.id as ThirdPartyLaunchers,
                  options
                )
              }
            />
          </Dialog>
        </div>
      )}
    </div>
  )
})
