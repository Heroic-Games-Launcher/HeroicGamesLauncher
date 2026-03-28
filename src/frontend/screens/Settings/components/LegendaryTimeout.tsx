import { useTranslation } from 'react-i18next'
import { TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const LegendaryTimeout = () => {
  const { t } = useTranslation()
  const [legendaryTimeout, setLegendaryTimeout] = useSetting(
    'legendaryTimeout',
    10
  )

  return (
    <TextInputField
      htmlId="legendary_timeout"
      label={t(
        'setting.legendaryTimeout',
        'Legendary/Epic Timeout (default is 10 seconds)'
      )}
      onChange={(newValue) => setLegendaryTimeout(Number(newValue))}
      value={legendaryTimeout.toString()}
    />
  )
}

export default LegendaryTimeout
