import React, { useContext, useEffect, useState } from 'react'
import { DLCInfo } from 'common/types/legendary'
import './index.scss'
import { useTranslation } from 'react-i18next'
import { getGameInfo, getInstallInfo, install, size } from 'frontend/helpers'
import { GameInfo, Runner } from 'common/types'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'frontend/assets/stop-icon-alt.svg'
import SvgButton from '../../SvgButton'

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
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [dlcInfo, setDlcInfo] = useState<GameInfo | null>(null)
  const [dlcSize, setDlcSize] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(true)
  const [progress] = hasProgress(app_name)

  const isInstalled = dlcInfo?.is_installed

  useEffect(() => {
    const checkInstalled = async () => {
      const info = await getGameInfo(app_name, runner)
      if (!info) {
        return
      }
      setDlcInfo(info)
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
          <SvgButton
            className="action"
            onClick={() => mainAction()}
            title={`${
              isInstalled
                ? t('button.uninstall', 'Uninstall')
                : t('button.install', 'Install')
            } (${title})`}
          >
            {isInstalled ? <StopIcon /> : <DownIcon />}
          </SvgButton>
        )}
        {isInstalling && (
          <SvgButton
            className="action"
            onClick={() => mainAction()}
            title={`${t('button.cancel', 'Cancel')} (${title})`}
          >
            <StopIconAlt />
          </SvgButton>
        )}
        {refreshing && (
          <span className="action">
            <FontAwesomeIcon className={'fa-spin-pulse'} icon={faSpinner} />
          </span>
        )}
      </div>
    </>
  )
}

export default React.memo(DLC)
