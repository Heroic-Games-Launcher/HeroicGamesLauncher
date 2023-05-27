import React, { useContext, useEffect, useState } from 'react'
import { DLCInfo } from 'common/types/legendary'
import './index.scss'
import { useTranslation } from 'react-i18next'
import { getGameInfo, getInstallInfo, install, size } from 'frontend/helpers'
import { GameInfo, Runner } from 'common/types'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import {
  faCancel,
  faCloudArrowDown,
  faSpinner,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import { hasProgress } from 'frontend/hooks/hasProgress'

type Props = {
  dlc: DLCInfo
  runner: Runner
  mainAppInfo: GameInfo
  onClose: () => void
}

const DLC = ({ dlc, runner, mainAppInfo, onClose }: Props) => {
  const { title, app_name } = dlc
  const { libraryStatus, showDialogModal } = useContext(ContextProvider)
  const { t } = useTranslation('gamepage')
  const [isInstalled, setIsInstalled] = useState(false)
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [dlcInfo, setDlcInfo] = useState<GameInfo | null>(null)
  const [dlcSize, setDlcSize] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(true)
  const [progress] = hasProgress(app_name)

  useEffect(() => {
    const checkInstalled = async () => {
      const info = await getGameInfo(app_name, runner)
      if (!info) {
        return
      }
      setDlcInfo(info)
      const installed = info.is_installed
      setIsInstalled(installed)
    }
    checkInstalled()
  }, [dlc, runner])

  useEffect(() => {
    setRefreshing(true)
    const getDlcSize = async () => {
      if (!mainAppInfo.install.platform) {
        return
      }
      const info = await getInstallInfo(
        app_name,
        runner,
        mainAppInfo.install.platform
      )
      if (!info) {
        return
      }
      setDlcSize(info.manifest.download_size)
      setRefreshing(false)
    }
    getDlcSize()
  }, [dlc, runner])

  const currentApp = libraryStatus.find((app) => app.appName === app_name)
  const isInstalling = currentApp?.status === 'installing'
  const showInstallButton = !isInstalling && !refreshing

  function mainAction() {
    if (isInstalled) {
      setShowUninstallModal(true)
    } else {
      const {
        install: { platform, install_path }
      } = mainAppInfo

      if (!dlcInfo || !platform || !install_path) {
        return
      }
      onClose()
      install({
        isInstalling,
        previousProgress: null,
        progress,
        showDialogModal,
        t,
        installPath: install_path,
        gameInfo: dlcInfo,
        platformToInstall: platform
      })
    }
  }

  return (
    <>
      {showUninstallModal && (
        <UninstallModal
          appName={app_name}
          runner={runner}
          onClose={() => setShowUninstallModal(false)}
          isDlc
        />
      )}
      <div className="dlcItem">
        <span className="title">{title}</span>
        {refreshing ? '...' : <span className="size">{size(dlcSize)}</span>}
        {showInstallButton && (
          <span className="action" onClick={() => mainAction()}>
            <FontAwesomeIcon
              icon={isInstalled ? faTrash : faCloudArrowDown}
              title={
                isInstalled
                  ? t('dlc.uninstall', 'Uninstall')
                  : t('dlc.install', 'Install')
              }
            />
          </span>
        )}
        {isInstalling && (
          <span className="action" onClick={() => mainAction()}>
            <FontAwesomeIcon
              icon={faCancel}
              title={t('dlc.cancel', 'Cancel')}
            />
          </span>
        )}
        {refreshing && (
          <FontAwesomeIcon
            className={'InstallModal__sizeIcon fa-spin-pulse'}
            icon={faSpinner}
          />
        )}
      </div>
    </>
  )
}

export default React.memo(DLC)
