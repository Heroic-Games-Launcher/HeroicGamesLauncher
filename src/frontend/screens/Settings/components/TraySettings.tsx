import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const TraySettings = () => {
  const { t } = useTranslation()
  const [exitToTray, setExitToTray] = useSetting('exitToTray', false)
  const [startInTray, setStartInTray] = useSetting('startInTray', false)
  const [noTrayIcon, setNoTrayIcon] = useSetting('noTrayIcon', false)

  return (
    <>
      <ToggleSwitch
        htmlId="noTrayIcon"
        value={noTrayIcon}
        handleChange={() => setNoTrayIcon(!noTrayIcon)}
        title={t(
          'setting.no-tray-icon',
          'Hide System Tray Icon (requires restart)'
        )}
      />

      <ToggleSwitch
        htmlId="exitToTray"
        value={exitToTray && !noTrayIcon}
        handleChange={() => setExitToTray(!exitToTray)}
        title={t('setting.exit-to-tray', 'Exit to System Tray')}
        disabled={noTrayIcon}
      />

      <ToggleSwitch
        htmlId="startInTray"
        value={startInTray && !noTrayIcon}
        handleChange={() => setStartInTray(!startInTray)}
        title={t('setting.start-in-tray', 'Start Minimized')}
        disabled={!exitToTray || noTrayIcon}
      />
    </>
  )
}

export default TraySettings
