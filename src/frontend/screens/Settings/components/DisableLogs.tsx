import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { toggleControllerIsDisabled } from 'frontend/helpers/gamepad'
import { ToggleSwitch } from 'frontend/components/UI'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const DisableLogs = () => {
  const { t } = useTranslation()
  const [disableLogs, setDisableLogs] = useSetting('disableLogs', false)

  useEffect(() => {
    toggleControllerIsDisabled(disableLogs)
  }, [disableLogs])

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="disableLogs"
        value={disableLogs}
        handleChange={() => setDisableLogs(!disableLogs)}
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
