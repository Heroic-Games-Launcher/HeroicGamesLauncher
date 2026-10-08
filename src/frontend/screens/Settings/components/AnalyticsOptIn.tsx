import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'

const AnalyticsOptIn = () => {
  const { t } = useTranslation()
  const [analyticsOptIn, setAnalyticsOptIn] = useSetting(
    'analyticsOptIn',
    false
  )

  return (
    <ToggleSwitch
      info={t(
        'help.analytics',
        'Enables Heroic to collect 100% anonymous usage data to help improve the application. Needs restart to take effect.'
      )}
      description={t(
        'setting.analytics.description',
        'Share anonymous usage data to help improve Heroic'
      )}
      htmlId="analyticsOptIn"
      value={analyticsOptIn}
      handleChange={() => setAnalyticsOptIn(!analyticsOptIn)}
      title={t(
        'setting.analyticsOptIn',
        'Send anonymous data to help Heroic development'
      )}
    />
  )
}

export default AnalyticsOptIn
