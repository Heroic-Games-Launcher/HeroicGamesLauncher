import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'

const UseDarkTrayIcon = () => {
  const { t } = useTranslation()
  const [darkTrayIcon, setDarkTrayIcon] = useGlobalConfig('darkTrayIcon')

  const toggleDarkTrayIcon = () => {
    setDarkTrayIcon(!darkTrayIcon)
    window.api.changeTrayColor()
  }

  return (
    <ToggleSwitch
      htmlId="changeTrayColor"
      value={darkTrayIcon}
      handleChange={toggleDarkTrayIcon}
      title={t('setting.darktray', 'Use Dark Tray Icon (needs restart)')}
    />
  )
}

export default UseDarkTrayIcon
