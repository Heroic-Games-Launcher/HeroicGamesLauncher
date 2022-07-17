import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'src/components/UI'
import { ipcRenderer } from 'src/helpers'

interface Props {
  eacRuntime: boolean
  battlEyeRuntime: boolean
  toggleEacRuntime: () => void
  toggleBattlEyeRuntime: () => void
}

export default function WineExtensions({
  eacRuntime,
  battlEyeRuntime,
  toggleEacRuntime,
  toggleBattlEyeRuntime
}: Props) {
  const [eacInstalling, setEacInstalling] = useState(false)
  const [battlEyeInstalling, setBattlEyeInstalling] = useState(false)
  const { t } = useTranslation()

  const handleEacRuntime = async () => {
    toggleEacRuntime()
    if (!eacRuntime) {
      const isInstalled = await ipcRenderer.invoke(
        'isRuntimeInstalled',
        'eac_runtime'
      )
      if (!isInstalled) {
        setEacInstalling(true)
        const success = await ipcRenderer.invoke(
          'downloadRuntime',
          'eac_runtime'
        )
        if (!success) {
          // We already know we're toggling the runtime on here, so toggling it again will make it stay off
          // Error handling/communication is handled in downloadRuntime by the backend
          toggleEacRuntime()
        }
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
        const success = await ipcRenderer.invoke(
          'downloadRuntime',
          'battleye_runtime'
        )
        if (!success) {
          toggleBattlEyeRuntime()
        }
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
