import React, { useEffect, useState } from 'react'
import { DLCInfo } from 'common/types/legendary'
import './index.scss'
import { useTranslation } from 'react-i18next'
import { getGameInfo } from 'frontend/helpers'
import { Runner } from 'common/types'
import UninstallModal from 'frontend/components/UI/UninstallModal'

type Props = {
  dlc: DLCInfo
  runner: Runner
}

const DLC = ({ dlc, runner }: Props) => {
  const { title, app_name } = dlc
  const { t } = useTranslation('gamepage')
  const [isInstalled, setIsInstalled] = useState(false)
  const [showUninstallModal, setShowUninstallModal] = useState(false)

  useEffect(() => {
    const checkInstalled = async () => {
      const dlcInfo = await getGameInfo(app_name, runner)
      if (!dlcInfo) {
        return
      }
      const installed = dlcInfo.is_installed
      setIsInstalled(installed)
    }
    checkInstalled()
  }, [dlc, runner])

  function mainAction() {
    if (isInstalled) {
      setShowUninstallModal(true)
    } else {
      console.log('installing')
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
        <span className="action" onClick={() => mainAction()}>
          {isInstalled
            ? t('dlc.uninstall', 'Uninstall')
            : t('dlc.install', 'Install')}
        </span>
      </div>
    </>
  )
}

export default React.memo(DLC)
