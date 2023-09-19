import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const UseFramelessWindow = () => {
  const { t } = useTranslation()
  const [framelessWindow, setFramelessWindow] = useSetting(
    'framelessWindow',
    false
  )

  return (
    <ToggleSwitch
      htmlId="framelessWindow"
      value={framelessWindow}
      handleChange={() => setFramelessWindow(!framelessWindow)}
      title={t(
        'setting.frameless-window',
        'Use frameless window (restart required)'
      )}
    />
  )
}

export default UseFramelessWindow
