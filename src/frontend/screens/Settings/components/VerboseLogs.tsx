import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const VerboseLogs = () => {
  const { t } = useTranslation()

  const [verboseLogs, setVerboseLogs] = useSetting('verboseLogs', true)

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="verboseLogs"
        value={verboseLogs}
        handleChange={() => setVerboseLogs(!verboseLogs)}
        title={t('setting.verboseLogs.description', 'Enable verbose logs')}
      />
    </div>
  )
}

export default VerboseLogs
