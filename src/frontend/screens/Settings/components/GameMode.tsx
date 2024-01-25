import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const GameMode = () => {
  const { t } = useTranslation()
  const { platform, showDialogModal } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [
    useGameMode,
    setUseGameMode,
    gameModeConfigFetched,
    isSetToDefault,
    resetToDefaultValue
  ] = useSharedConfig('gameMode')
  const [eacRuntime, setEacRuntime, eacConfigFetched] =
    useSharedConfig('eacRuntime')

  if (!isLinux || !gameModeConfigFetched || !eacConfigFetched) {
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
        value={useGameMode}
        handleChange={handleGameMode}
        title={t('setting.gamemode')}
        isSetToDefaultValue={isSetToDefault}
        resetToDefaultValue={resetToDefaultValue}
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
