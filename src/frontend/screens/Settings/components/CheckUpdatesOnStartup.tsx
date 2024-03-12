import React, { useEffect, useState } from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import { useTranslation } from 'react-i18next'
import ResetToDefaultButton from 'frontend/components/UI/ResetToDefaultButton'

const CheckUpdatesOnStartup = () => {
  const { t } = useTranslation()
  const [
    checkForUpdatesOnStartup,
    setCheckForUpdatesOnStartup,
    ,
    isSetToDefault,
    resetToDefaultValue
  ] = useGlobalConfig('checkForUpdatesOnStartup')

  const [show, setShow] = useState(checkForUpdatesOnStartup)

  useEffect(() => {
    window.api.showUpdateSetting().then((s) => setShow(s))
  }, [])

  if (!show) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="checkForUpdatesOnStartup"
      value={checkForUpdatesOnStartup}
      handleChange={async () =>
        setCheckForUpdatesOnStartup(!checkForUpdatesOnStartup)
      }
      title={t(
        'setting.checkForUpdatesOnStartup',
        'Check for Heroic Updates on Startup'
      )}
      inlineElement={
        <ResetToDefaultButton
          resetToDefault={resetToDefaultValue}
          isSetToDefault={isSetToDefault}
        />
      }
    />
  )
}

export default CheckUpdatesOnStartup
