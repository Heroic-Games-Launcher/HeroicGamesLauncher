import React from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const AnalyticsOptIn = () => {
  const { t } = useTranslation()
  const [analyticsOptIn, setAnalyticsOptIn] = useSetting('analyticsOptIn', true)

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="analyticsOptIn"
        value={analyticsOptIn}
        handleChange={() => setAnalyticsOptIn(!analyticsOptIn)}
        title={t(
          'setting.analyticsOptIn',
          'Send anonymous data to help Heroic development'
        )}
      />
      <InfoIcon
        text={t(
          'help.analyticsOptIn',
          'Enables Heroic to collect 100% anonymous usage data to help improve the application.'
        )}
      />
    </div>
  )
}

export default AnalyticsOptIn
