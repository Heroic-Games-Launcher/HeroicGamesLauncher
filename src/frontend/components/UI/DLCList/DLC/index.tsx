import React, { useContext, useEffect, useState } from 'react'
import './index.scss'
import { useTranslation } from 'react-i18next'
import { getGameInfo, getInstallInfo, install, size } from 'frontend/helpers'
import { GameInfo } from 'common/types'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import { hasProgress } from 'frontend/hooks/hasProgress'
import DownIcon from 'frontend/assets/down-icon.svg?react'
import StopIcon from 'frontend/assets/stop-icon.svg?react'
import StopIconAlt from 'frontend/assets/stop-icon-alt.svg?react'
import SvgButton from '../../SvgButton'
import type { GameHandle } from 'frontend/helpers/ipc'

type Props = {
  dlc: GameHandle
  mainAppInfo: GameInfo
  onClose: () => void
}

const DLC = ({ dlc, mainAppInfo, onClose }: Props) => {
  const { libraryStatus, showDialogModal } = useContext(ContextProvider)
  const { t } = useTranslation('gamepage')
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [dlcInfo, setDlcInfo] = useState<GameInfo | null>(null)
  const [dlcSize, setDlcSize] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(true)
  const [progress] = hasProgress(dlc)

  const isInstalled = dlcInfo?.is_installed

  useEffect(() => {
    const checkInstalled = async () => {
      const info = await getGameInfo(dlc)
      if (!info) {
        return
      }
      setDlcInfo(info)
    }
    checkInstalled()
  }, [dlc])

  useEffect(() => {
    setRefreshing(true)
    const getDlcSize = async () => {
      if (!mainAppInfo.install.platform) {
        return
      }
      const info = await getInstallInfo(dlc, mainAppInfo.install.platform)
      if (!info) {
        return
      }
      setDlcSize(info?.manifest?.download_size || 0)
      setRefreshing(false)
    }
    getDlcSize()
  }, [dlc])

  const currentApp = libraryStatus.find((s) => s.appName === dlc.id)
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

  if (!dlcInfo) return <></>

  return (
    <>
      {showUninstallModal && (
        <UninstallModal
          game={dlc}
          onClose={() => setShowUninstallModal(false)}
          isDlc
        />
      )}
      <div className="dlcItem">
        <span className="title">{dlcInfo.title}</span>
        {refreshing ? '...' : <span className="size">{size(dlcSize)}</span>}
        {showInstallButton && (
          <SvgButton
            className="action"
            onClick={() => mainAction()}
            title={`${
              isInstalled
                ? t('button.uninstall', 'Uninstall')
                : t('button.install', 'Install')
            } (${dlcInfo.title})`}
          >
            {isInstalled ? <StopIcon /> : <DownIcon />}
          </SvgButton>
        )}
        {isInstalling && (
          <SvgButton
            className="action"
            onClick={() => mainAction()}
            title={`${t('button.cancel', 'Cancel')} (${dlcInfo.title})`}
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
