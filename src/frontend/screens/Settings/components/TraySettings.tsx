import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import ResetToDefaultButton from 'frontend/components/UI/ResetToDefaultButton'

const TraySettings = () => {
  const { t } = useTranslation()
  const [
    exitToTray,
    setExitToTray,
    ,
    exitToTraySetToDefault,
    exitToTrayResetToDefault
  ] = useGlobalConfig('exitToTray')
  const [
    startInTray,
    setStartInTray,
    ,
    startInTraySetToDefault,
    startInTrayResetToDefault
  ] = useGlobalConfig('startMinimizedToTray')

  return (
    <>
      <ToggleSwitch
        htmlId="exitToTray"
        value={exitToTray}
        handleChange={async () => setExitToTray(!exitToTray)}
        title={t('setting.exit-to-tray', 'Exit to System Tray')}
        inlineElement={
          <ResetToDefaultButton
            resetToDefault={exitToTrayResetToDefault}
            isSetToDefault={exitToTraySetToDefault}
          />
        }
      />

      {exitToTray && (
        <ToggleSwitch
          htmlId="startInTray"
          value={startInTray}
          handleChange={async () => setStartInTray(!startInTray)}
          title={t('setting.start-in-tray', 'Start Minimized')}
          inlineElement={
            <ResetToDefaultButton
              resetToDefault={startInTrayResetToDefault}
              isSetToDefault={startInTraySetToDefault}
            />
          }
        />
      )}
    </>
  )
}

export default TraySettings
