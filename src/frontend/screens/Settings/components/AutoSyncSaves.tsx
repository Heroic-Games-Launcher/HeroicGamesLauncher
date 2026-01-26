import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'

const AutoSyncSaves = () => {
  const { t } = useTranslation()
  const [autoSyncSaves, setAutoSyncSaves] = useSetting('autoSyncSaves', false)

  return (
    <ToggleSwitch
      htmlId="autoSyncSaves"
      value={autoSyncSaves}
      handleChange={() => setAutoSyncSaves(!autoSyncSaves)}
      title={t(
        'setting.autosync-default',
        'Autosync saves by default (can be disabled per-game)'
      )}
    />
  )
}

export default AutoSyncSaves
