import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { useGlobalConfig } from 'frontend/hooks/config'

const DisableLogs = () => {
  const { t } = useTranslation()
  const [disableLogs, setDisableLogs] = useGlobalConfig('disableLogs')

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="disableLogs"
        value={disableLogs}
        handleChange={async () => setDisableLogs(!disableLogs)}
        title={t('setting.disable_logs', 'Disable Logs')}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.disable_logs',
          'Toggle this checkbox ON to disable most of the writes to log files (critical information is always logged). Make sure to turn OFF this setting before reporting any issue.'
        )}
      />
    </div>
  )
}

export default DisableLogs
