import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const GameMode = () => {
  const { t } = useTranslation()
  const { platform, showDialogModal } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [useGameMode, setUseGameMode] = useSetting('useGameMode', false)
  const [eacRuntime, setEacRuntime] = useSetting('eacRuntime', false)

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
            "The EAC runtime is enabled, which won't function correctly without GameMode. Do you want to disable the EAC runtime and GameMode?"
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
    <ToggleSwitch
      info={t(
        'help.gamemode',
        'GameMode applies temporary system tweaks while the game runs. Most of its CPU-governor work is obsolete on modern kernels, and with umu it often cannot register the game process.'
      )}
      description={t(
        'setting.gamemode-description',
        'Legacy CPU/scheduler tweaks for the running game'
      )}
      htmlId="gamemode"
      value={useGameMode}
      handleChange={handleGameMode}
      title={t('setting.gamemode', 'GameMode (legacy tweaks)')}
    />
  )
}

export default GameMode
