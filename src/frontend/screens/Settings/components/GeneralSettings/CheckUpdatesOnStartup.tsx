import React, { useEffect, useState } from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'

const CheckUpdatesOnStartup = () => {
  const { t } = useTranslation()
  const [checkForUpdatesOnStartup, setCheckForUpdatesOnStartup] = useSetting(
    'checkForUpdatesOnStartup',
    true
  )

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
      handleChange={() =>
        setCheckForUpdatesOnStartup(!checkForUpdatesOnStartup)
      }
      title={t(
        'setting.checkForUpdatesOnStartup',
        'Check for Heroic Updates on Startup'
      )}
    />
  )
}

export default CheckUpdatesOnStartup
