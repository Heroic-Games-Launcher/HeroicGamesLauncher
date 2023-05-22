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
        'Close Heroic After Game Launch ⚠️ Disables Cloud Async'
      )}
      description={t(
        'setting.auto-close-launcher-description',
        'Enabling this setting will disable usage of cloud async but will slightly improve performance'
      )}
    />
  )
}

export default AutoCloseLauncher
