import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const ProcessMitigations = () => {
  const { t } = useTranslation()

  const [ProcessMitigations, setProcessMitigations] = useSetting('ProcessMitigations', true)

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="ProcessMitigations"
        value={ProcessMitigations}
        handleChange={() => setProcessMitigations(!ProcessMitigations)}
        title={t('setting.ProcessMitigations.description', 'Enable Process Mitigations')}
      />
    </div>
  )
}

export default ProcessMitigations
