import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const UseDarkTrayIcon = () => {
  const { t } = useTranslation()
  const [darkTrayIcon, setDarkTrayIcon] = useSetting('darkTrayIcon', false)

  const toggleDarkTrayIcon = () => {
    setDarkTrayIcon(!darkTrayIcon)
    window.api.changeTrayColor()
  }

  return (
    <ToggleSwitch
      description={t(
        'setting.darktrayicon.description',
        'Use the dark variant of the tray icon, better on light panels'
      )}
      htmlId="changeTrayColor"
      value={darkTrayIcon}
      handleChange={toggleDarkTrayIcon}
      title={t('setting.darktray', 'Use Dark Tray Icon (needs restart)')}
    />
  )
}

export default UseDarkTrayIcon
