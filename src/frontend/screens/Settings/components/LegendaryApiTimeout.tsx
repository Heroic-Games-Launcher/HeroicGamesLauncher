import { useTranslation } from 'react-i18next'
import SliderField from 'frontend/components/UI/SliderField'
import useSetting from 'frontend/hooks/useSetting'

const LegendaryApiTimeout = () => {
  const { t } = useTranslation()
  // 10 seconds is Legendary's own default
  const [apiTimeout, setApiTimeout] = useSetting('legendaryApiTimeout', 10)

  return (
    <SliderField
      htmlId="setting-legendary-api-timeout"
      value={apiTimeout}
      step={5}
      min={10}
      max={120}
      onChange={setApiTimeout}
      label={t('setting.legendary-api-timeout', 'Epic API timeout (seconds)')}
      description={t(
        'setting.legendary-api-timeout-description',
        "How long Legendary waits for Epic's servers before giving up. Increase it if loading your Epic library fails with a timeout error, which can happen with large libraries."
      )}
      marks={[
        { value: 10, label: '10 s' },
        { value: 120, label: '120 s' }
      ]}
    />
  )
}

export default LegendaryApiTimeout
