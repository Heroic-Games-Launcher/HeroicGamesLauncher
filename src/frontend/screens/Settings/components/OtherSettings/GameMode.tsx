import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const GameMode = () => {
  const { t } = useTranslation()
  const { platform, showDialogModal } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [useGameMode, setUseGameMode] = useSetting<boolean>(
    'useGameMode',
    false
  )
  const [eacRuntime, setEacRuntime] = useSetting<boolean>('eacRuntime', false)

  if (!isLinux) {
    return <></>
  }

  async function handleGameMode() {
    if (useGameMode && eacRuntime) {
      const isFlatpak = await window.api.isFlatpak()
      if (isFlatpak) {
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
    setUseGameMode(!useGameMode)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="gamemode"
        value={false}
        handleChange={handleGameMode}
        title={t('setting.gamemode')}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.gamemode',
          'Feral GameMode applies automatic and temporary tweaks to the system when running games. Enabling may improve performance.'
        )}
      />
    </div>
  )
}

export default GameMode
