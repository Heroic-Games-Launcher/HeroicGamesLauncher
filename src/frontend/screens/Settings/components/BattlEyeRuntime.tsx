import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import ContextProvider from 'frontend/state/ContextProvider'
import { useSharedConfig } from 'frontend/hooks/config'

const BattlEyeRuntime = () => {
  const { t } = useTranslation()
  const [installing, setInstalling] = useState(false)
  const [
    battlEyeRuntime,
    setBattlEyeRuntime,
    ,
    isSetToDefault,
    resetToDefaultValue
  ] = useSharedConfig('battlEyeRuntime')
  const { platform } = useContext(ContextProvider)

  if (platform !== 'linux') {
    return null
  }

  const handleBattlEyeRuntime = async () => {
    if (!battlEyeRuntime) {
      const isInstalled =
        await window.api.isRuntimeInstalled('battleye_runtime')
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
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="battlEyeRuntime"
        value={battlEyeRuntime}
        handleChange={handleBattlEyeRuntime}
        title={t('settings.battlEyeRuntime.name', 'BattlEye AntiCheat Runtime')}
        isSetToDefaultValue={isSetToDefault}
        resetToDefaultValue={resetToDefaultValue}
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
    </div>
  )
}

export default BattlEyeRuntime
