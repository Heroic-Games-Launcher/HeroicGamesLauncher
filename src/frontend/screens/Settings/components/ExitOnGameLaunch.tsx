import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const ExitOnGameLaunch = () => {
  const { t } = useTranslation()
  const [exitOnLaunch, setExitOnLaunch] = useSetting(
    'exitOnLaunch',
    false
  )

  return (
    <ToggleSwitch
      htmlId="exitOnLaunch"
      value={exitOnLaunch}
      handleChange={() => setExitOnLaunch(!exitOnLaunch)}
      title={t(
        'setting.exit-on-launch',
        'Exit Heroic After Game Launch'
      )}
    />
  )
}

export default ExitOnGameLaunch
