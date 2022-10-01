import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const MinimizeOnGameLaunch = () => {
  const { t } = useTranslation()
  const [minimizeOnLaunch, setMinimizeOnLaunch] = useSetting<boolean>(
    'minimizeOnLaunch',
    false
  )

  return (
    <ToggleSwitch
      htmlId="minimizeOnLaunch"
      value={minimizeOnLaunch}
      handleChange={() => setMinimizeOnLaunch(!minimizeOnLaunch)}
      title={t(
        'setting.minimize-on-launch',
        'Minimize Heroic After Game Launch'
      )}
    />
  )
}

export default MinimizeOnGameLaunch
