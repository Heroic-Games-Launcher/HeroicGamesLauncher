import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const AutoCloseLauncher = () => {
  const { t } = useTranslation()
  const [autoCloseLauncher, setAutoCloseLauncher] = useSetting(
    'autoCloseLauncher',
    false
  )

  return (
    <ToggleSwitch
      htmlId="autoCloseLauncher"
      value={autoCloseLauncher}
      handleChange={() => setAutoCloseLauncher(!autoCloseLauncher)}
      title={t(
        'setting.auto-close-launcher',
        'Close Heroic After Game Launch ⚠️ Disables Cloud Saves'
      )}
      description={t(
        'setting.auto-close-launcher-description',
        'Closes Heroic after a game is laucnhed. Note that this prevents cloud saves to be properly synced after closing the game.'
      )}
    />
  )
}

export default AutoCloseLauncher
