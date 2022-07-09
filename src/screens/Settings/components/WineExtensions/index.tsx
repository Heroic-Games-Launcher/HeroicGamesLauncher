import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'src/components/UI'
import { ipcRenderer } from 'src/helpers'

interface Props {
  eacRuntime: boolean
  battlEyeRuntime: boolean
  gameMode: boolean
  toggleEacRuntime: () => void
  toggleBattlEyeRuntime: () => void
  toggleGameMode: () => void
}

export default function WineExtensions({
  eacRuntime,
  battlEyeRuntime,
  gameMode,
  toggleEacRuntime,
  toggleBattlEyeRuntime,
  toggleGameMode
}: Props) {
  const [eacInstalling, setEacInstalling] = useState(false)
  const [battlEyeInstalling, setBattlEyeInstalling] = useState(false)
  const { t } = useTranslation()

  const handleEacRuntime = async () => {
    toggleEacRuntime()
    if (!eacRuntime) {
      // Check if GameMode is turned on if the EAC runtime was turned on
      if (!gameMode) {
        const { response } = await ipcRenderer.invoke('openMessageBox', {
          buttons: [t('box.yes'), t('box.no')],
          message: t(
            'settings.eacRuntime.gameModeRequired.message',
            'Feral GameMode is required for the EAC runtime to work correctly. Do you want to enable it now?'
          ),
          title: t(
            'settings.eacRuntime.gameModeRequired.title',
            'GameMode required'
          )
        })
        if (response === 0) {
          toggleGameMode()
        }
      }

      const isInstalled = await ipcRenderer.invoke(
        'isRuntimeInstalled',
        'eac_runtime'
      )
      if (!isInstalled) {
        setEacInstalling(true)
        await ipcRenderer.invoke('downloadRuntime', 'eac_runtime')
        setEacInstalling(false)
      }
    }
  }

  const handleBattlEyeRuntime = async () => {
    if (!battlEyeRuntime) {
      const isInstalled = await ipcRenderer.invoke(
        'isRuntimeInstalled',
        'battleye_runtime'
      )
      if (!isInstalled) {
        setBattlEyeInstalling(true)
        await ipcRenderer.invoke('downloadRuntime', 'battleye_runtime')
        setBattlEyeInstalling(false)
      }
    }
    toggleBattlEyeRuntime()
  }

  return (
    <>
      <h3 className="settingsSubheader">
        {t('settings.navbar.wineExt', 'Wine Extensions')}
      </h3>
      <ToggleSwitch
        htmlId="eacRuntime"
        value={eacRuntime}
        handleChange={handleEacRuntime}
        title={t('settings.eacRuntime.name', 'EasyAntiCheat Runtime')}
      />
      {eacInstalling && (
        <span>
          <FontAwesomeIcon className="fa-spin" icon={faSyncAlt} />
          {t('settings.eacRuntime.installing', 'Installing EAC Runtime...')}
        </span>
      )}
      <ToggleSwitch
        htmlId="battlEyeRuntime"
        value={battlEyeRuntime}
        handleChange={handleBattlEyeRuntime}
        title={t('settings.battlEyeRuntime.name', 'BattlEye AntiCheat Runtime')}
      />
      {battlEyeInstalling && (
        <span>
          <FontAwesomeIcon className="fa-spin" icon={faSyncAlt} />
          {t(
            'settings.battlEyeRuntime.installing',
            'Installing BattlEye Runtime...'
          )}
        </span>
      )}
    </>
  )
}
