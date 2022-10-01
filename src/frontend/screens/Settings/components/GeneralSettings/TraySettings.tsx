import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const TraySettings = () => {
  const { t } = useTranslation()
  const [exitToTray, setExitToTray] = useSetting<boolean>('exitToTray', false)
  const [startInTray, setStartInTray] = useSetting<boolean>(
    'startInTray',
    false
  )

  return (
    <>
      <ToggleSwitch
        htmlId="exitToTray"
        value={exitToTray}
        handleChange={() => setExitToTray(!exitToTray)}
        title={t('setting.exit-to-tray', 'Exit to System Tray')}
      />

      {exitToTray && (
        <ToggleSwitch
          htmlId="startInTray"
          value={startInTray}
          handleChange={() => setStartInTray(!startInTray)}
          title={t('setting.start-in-tray', 'Start Minimized')}
        />
      )}
    </>
  )
}

export default TraySettings
