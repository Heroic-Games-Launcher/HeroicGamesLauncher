import React, { useContext, useState, useEffect } from 'react'
import { faSteam } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import './index.scss'

import SteamInstallDialog from './SteamInstallDialog'
import { launch } from 'frontend/helpers'
import { hasStatus } from 'frontend/hooks/hasStatus'
import { Tooltip } from '@mui/material/'
import { WineInstallation } from 'common/types'

export default function SteamInstallButton({
  dataTourId
}: {
  dataTourId?: string
}) {
  const { showDialogModal, sideloadedLibrary } = useContext(ContextProvider)
  const { t } = useTranslation('gamepage')
  const [showInstallDialog, setShowInstallDialog] = useState(false)

  const { status } = hasStatus('steam')
  const isLaunching = status === 'playing'

  const isSteamInstalled =
    sideloadedLibrary.find((app) => app.app_name === 'steam')?.is_installed ||
    false

  const [wineList, setWineList] = useState<WineInstallation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // Fetch wine list on component mount
  useEffect(() => {
    const fetchWineList = async () => {
      try {
        setIsLoading(true)
        const response = await window.api.getAlternativeWine()
        setWineList(response || [])
      } catch (error) {
        console.error('Failed to fetch wine list:', error)
        setWineList([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchWineList()
  }, [])

  const isCompatibilityLayerAvailable = wineList.length > 0

  // Function to handle Steam installation
  const installSteam = async () => {
    try {
      setIsInstalling(true)
      await window.api.installSteamWindows()
      setShowInstallDialog(false)
    } catch (error) {
      console.error('Failed to install Steam:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  async function handleSteamInstallation() {
    if (isSteamInstalled) {
      return launch({
        appName: 'steam',
        t,
        runner: 'sideload',
        showDialogModal,
        hasUpdate: false
      })
    }

    return setShowInstallDialog(true)
  }

  function renderButtonText() {
    if (isLaunching) {
      return t('label.steam.launching', 'Launching Steam...')
    }
    if (isInstalling) {
      return t('label.steam.installing', 'Installing Steam...')
    }
    if (isSteamInstalled) {
      return t('label.steam.launch', 'Launch Steam')
    }
    return t('label.steam.install', 'Install Steam')
  }

  const toolTipText = isSteamInstalled
    ? t(
        'label.steam.launch',
        'Launch Steam using the Heroic Compatibility Layer'
      )
    : t(
        'label.steam.install-tooltip',
        `This will install the Windows version of Steam and it will run using a Heroic Compatibility Layer. \n
    Some games especially older titles, newer 3D games, or those with anti-cheat software may not work properly. \n
    `
      )

  const compatibilityLayerNotAvailableTooltip = t(
    'label.steam.compatibility-layer-not-available',
    `Compatibility layer not available. Please install one from "Settings > Wine Manager" first.`
  )

  const isButtonDisabled =
    !isCompatibilityLayerAvailable || isInstalling || isLaunching || isLoading

  return (
    <>
      <Tooltip
        arrow
        title={
          isCompatibilityLayerAvailable
            ? toolTipText
            : compatibilityLayerNotAvailableTooltip
        }
      >
        <button
          data-tour={dataTourId}
          onClick={handleSteamInstallation}
          disabled={isButtonDisabled}
          className="installSteamButton"
        >
          <FontAwesomeIcon icon={faSteam} size="lg" />
          {renderButtonText()}
        </button>
      </Tooltip>
      {showInstallDialog ? (
        <SteamInstallDialog
          isInstalling={isInstalling}
          onClose={() => setShowInstallDialog(false)}
          onInstall={installSteam}
        />
      ) : null}
    </>
  )
}
