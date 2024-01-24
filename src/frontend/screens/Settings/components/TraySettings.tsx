import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'

const TraySettings = () => {
  const { t } = useTranslation()
  const [exitToTray, setExitToTray] = useGlobalConfig('exitToTray')
  const [startInTray, setStartInTray] = useGlobalConfig('startMinimizedToTray')

  return (
    <>
      <ToggleSwitch
        htmlId="exitToTray"
        value={exitToTray}
        handleChange={async () => setExitToTray(!exitToTray)}
        title={t('setting.exit-to-tray', 'Exit to System Tray')}
      />

      {exitToTray && (
        <ToggleSwitch
          htmlId="startInTray"
          value={startInTray}
          handleChange={async () => setStartInTray(!startInTray)}
          title={t('setting.start-in-tray', 'Start Minimized')}
        />
      )}
    </>
  )
}

export default TraySettings
