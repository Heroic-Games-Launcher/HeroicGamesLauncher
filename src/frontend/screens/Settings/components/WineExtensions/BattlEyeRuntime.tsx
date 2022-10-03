import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'

const BattlEyeRuntime = () => {
  const { t } = useTranslation()
  const [installing, setInstalling] = useState(false)
  const [battlEyeRuntime, setBattlEyeRuntime] = useSetting<boolean>(
    'battlEyeRuntime',
    false
  )

  const handleBattlEyeRuntime = async () => {
    if (!battlEyeRuntime) {
      const isInstalled = await window.api.isRuntimeInstalled(
        'battleye_runtime'
      )
      if (!isInstalled) {
        setInstalling(true)
        const success = await window.api.downloadRuntime('battleye_runtime')
        setInstalling(false)
        if (!success) {
          return
        }
      }
    }
    setBattlEyeRuntime(!battlEyeRuntime)
  }

  return (
    <>
      <ToggleSwitch
        htmlId="battlEyeRuntime"
        value={battlEyeRuntime}
        handleChange={handleBattlEyeRuntime}
        title={t('settings.battlEyeRuntime.name', 'BattlEye AntiCheat Runtime')}
      />
      {installing && (
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

export default BattlEyeRuntime
