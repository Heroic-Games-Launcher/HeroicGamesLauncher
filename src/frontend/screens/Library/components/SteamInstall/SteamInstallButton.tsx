import React, { useContext, useState } from 'react'
import { faSteam } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'

import SteamInstallDialog from './SteamInstallDialog'
import { launch } from 'frontend/helpers'
import { useMutation, useQuery } from '@tanstack/react-query'
import { hasStatus } from 'frontend/hooks/hasStatus'
import { Tooltip } from '@mui/material'

export default function SteamInstallButton() {
  const { platform, showDialogModal, sideloadedLibrary } =
    useContext(ContextProvider)
  const { t } = useTranslation()
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [showAlert, setShowAlert] = useState<'success' | 'danger' | 'none'>(
    'none'
  )
  const { status } = hasStatus('steam')
  const isLaunching = status === 'playing'

  const isMac = platform === 'darwin'
  const isSteamInstalled =
    (isMac &&
      sideloadedLibrary.find((app) => app.app_name === 'steam')
        ?.is_installed) ||
    false

  const wineList = useQuery({
    queryKey: ['alternativeWine'],
    queryFn: async () => {
      const response = await window.api.getAlternativeWine()
      if (!response) return []
      return response
    }
  })

  const isCompatibilityLayerAvailable =
    wineList.data && wineList.data.length > 0

  const installSteamMutation = useMutation({
    mutationKey: ['steamInstall'],
    onSuccess: () => {
      setShowAlert('success')
      setTimeout(() => setShowAlert('none'), 5000)
      setShowInstallDialog(false)
    },
    onError: () => {
      setShowAlert('danger')
      setTimeout(() => setShowAlert('none'), 5000)
    },
    mutationFn: async () => window.api.installSteamWindows()
  })

  const isInstalling = installSteamMutation.isPending

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
      return t('Launching Steam', 'Launching Steam...')
    }
    if (isInstalling) {
      return t('Installing Steam', 'Installing Steam...')
    }
    if (isSteamInstalled) {
      return t('Launch Steam', 'Launch Steam')
    }
    return t('Install Steam', 'Install Steam')
  }

  const toolTipText = isSteamInstalled
    ? t(
        'steam-install.launch-tooltip',
        'Launch Steam using the Heroic Compatibility Layer'
      )
    : t(
        'steam-install.tooltip',
        `This will install the Windows version of Steam and it will run using a Heroic Compatibility Layer. \n
    Some games especially older titles, newer 3D games, or those with anti-cheat software may not work properly. \n
    The Recommended specs are a Mac with Apple Silicon CPU (M1 or above) and at least 16GB of RAM.`
      )

  const comatibilityLayerNotAvailableTooltip = t(
    'steam-install.compatibility-layer-not-available',
    `Compatibility layer not available. Please install one from "Settings > Wine Manager" first.`
  )

  const showSuccessAlert = showAlert === 'success'
  const showErrorAlert = showAlert === 'danger'
  const isButtonDisabled =
    !isCompatibilityLayerAvailable || isInstalling || isLaunching

  return (
    <>
      <Tooltip
        title={
          isCompatibilityLayerAvailable
            ? toolTipText
            : comatibilityLayerNotAvailableTooltip
        }
        className={'Tooltip caption-sm'}
      >
        <button onClick={handleSteamInstallation} disabled={isButtonDisabled}>
          <FontAwesomeIcon icon={faSteam} size="lg" />
          {renderButtonText()}
        </button>
      </Tooltip>
      {showInstallDialog ? (
        <SteamInstallDialog
          isInstalling={isInstalling}
          onClose={() => setShowInstallDialog(false)}
          onInstall={installSteamMutation.mutate}
        />
      ) : null}
      {showSuccessAlert ? (
        <div className="alert alert-success">
          {t('Steam Installation Complete', 'Steam Installation Complete')}
        </div>
      ) : null}
      {showErrorAlert ? (
        <div className="alert alert-danger">
          {t('Steam Installation Failed', 'Steam Installation Failed')}
        </div>
      ) : null}
    </>
  )
}
