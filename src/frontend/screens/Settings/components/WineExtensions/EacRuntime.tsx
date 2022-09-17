import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { ipcRenderer } from 'frontend/helpers'

const EacRuntime = () => {
  const { t } = useTranslation()
  const [installing, setInstalling] = useState(false)
  const [eacRuntime, setEacRuntime] = useSetting<boolean>('eacRuntime', false)
  const [useGameMode, setUseGameMode] = useSetting<boolean>(
    'useGameMode',
    false
  )

  const handleEacRuntime = async () => {
    if (!eacRuntime) {
      if (!useGameMode) {
        const isFlatpak = await ipcRenderer.invoke('isFlatpak')
        if (isFlatpak) {
          const { response } = await ipcRenderer.invoke('openMessageBox', {
            message: t(
              'settings.eacRuntime.gameModeRequired.message',
              'GameMode is required for the EAC runtime to work on Flatpak. Do you want to enable it now?'
            ),
            title: t(
              'settings.eacRuntime.gameModeRequired.title',
              'GameMode required'
            ),
            buttons: [t('box.yes'), t('box.no')]
          })
          if (response === 1) {
            return
          }
          setUseGameMode(!useGameMode)
        }
      }
      const isInstalled = await ipcRenderer.invoke(
        'isRuntimeInstalled',
        'eac_runtime'
      )
      if (!isInstalled) {
        setInstalling(true)
        const success = await ipcRenderer.invoke(
          'downloadRuntime',
          'eac_runtime'
        )
        setInstalling(false)
        if (!success) {
          return
        }
      }
    }
    setEacRuntime(!eacRuntime)
  }
  return (
    <>
      <ToggleSwitch
        htmlId="eacRuntime"
        value={eacRuntime}
        handleChange={handleEacRuntime}
        title={t('settings.eacRuntime.name', 'EasyAntiCheat Runtime')}
      />
      {installing && (
        <span>
          <FontAwesomeIcon className="fa-spin" icon={faSyncAlt} />
          {t('settings.eacRuntime.installing', 'Installing EAC Runtime...')}
        </span>
      )}
    </>
  )
}

export default EacRuntime
