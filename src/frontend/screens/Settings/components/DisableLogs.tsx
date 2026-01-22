import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const DisableLogs = () => {
  const { t } = useTranslation()
  const [disableLogs, setDisableLogs] = useSetting('disableLogs', false)

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="disableLogs"
        value={disableLogs}
        handleChange={() => setDisableLogs(!disableLogs)}
        title={t('setting.disable_logs', 'Disable Logs')}
      />

      <InfoIcon
        text={t(
          'help.disable_logs',
          'Toggle this checkbox ON to disable most of the writes to log files (critical information is always logged). Make sure to turn OFF this setting before reporting any issue.'
        )}
      />
    </div>
  )
}

export default DisableLogs
