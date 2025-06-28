import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const GameMode = () => {
  const { t } = useTranslation()
  const { platform, showDialogModal } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [useGameMode, setUseGameMode] = useSetting('useGameMode', false)
  const [eacRuntime, setEacRuntime] = useSetting('eacRuntime', false)
  const [escapeFlatpakSandbox] = useSetting('escapeFlatpakSandbox', false)

  if (!isLinux) {
    return <></>
  }

  function handleGameMode() {
    if (useGameMode && eacRuntime) {
      if (window.isFlatpak) {
        showDialogModal({
          showDialog: true,
          title: t(
            'settings.gameMode.eacRuntimeEnabled.title',
            'EAC runtime enabled'
          ),
          message: t(
            'settings.gameMode.eacRuntimeEnabled.message',
            "The EAC runtime is enabled, which won't function correctly without GameMode. Do you want to disable the EAC Runtime and GameMode?"
          ),
          buttons: [
            {
              text: t('box.yes'),
              onClick: () => {
                setEacRuntime(!eacRuntime)
              }
            },
            { text: t('box.no') }
          ]
        })
      }
    }
    if (!useGameMode && escapeFlatpakSandbox && window.isFlatpak) {
      showDialogModal({
        showDialog: true,
        title: t('settings.EscapeFlatpakSandbox.escapeSandboxEnabled.title'),
        message: t(
          'settings.EscapeFlatpakSandbox.escapeSandboxEnabled.message'
        ),
        buttons: [{ text: t('box.ok') }]
      })
    }
    setUseGameMode(!useGameMode)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="gamemode"
        value={useGameMode}
        handleChange={handleGameMode}
        title={t('setting.gamemode')}
      />

      <InfoIcon
        text={t(
          'help.gamemode',
          'Feral GameMode applies automatic and temporary tweaks to the system when running games. Enabling may improve performance.'
        )}
      />
    </div>
  )
}

export default GameMode
