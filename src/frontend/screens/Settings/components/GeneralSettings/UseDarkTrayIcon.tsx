import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { ipcRenderer } from 'frontend/helpers'
import useSetting from 'frontend/hooks/useSetting'

const UseDarkTrayIcon = () => {
  const { t } = useTranslation()
  const [darkTrayIcon, setDarkTrayIcon] = useSetting<boolean>(
    'darkTrayIcon',
    false
  )

  const toggleDarkTrayIcon = () => {
    setDarkTrayIcon(!darkTrayIcon)
    ipcRenderer.send('changeTrayColor')
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
