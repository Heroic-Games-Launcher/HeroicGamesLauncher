import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const VerboseLogs = () => {
  const { t } = useTranslation()

  const { isDefault } = useContext(SettingsContext)

  const [verboseLogs, setVerboseLogs] = useSetting('verboseLogs', false)

  if (isDefault) {
    return <></>
  }

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
