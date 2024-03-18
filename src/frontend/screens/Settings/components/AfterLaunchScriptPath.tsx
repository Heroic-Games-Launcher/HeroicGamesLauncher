import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox } from 'frontend/components/UI'

const AfterLaunchScriptPath = () => {
  const { t } = useTranslation()
  const { isDefault, gameInfo } = useContext(SettingsContext)

  const [scriptPath, setScriptPath] = useSetting('afterLaunchScriptPath', '')

  if (isDefault) {
    return <></>
  }

  return (
    <PathSelectionBox
      type="file"
      onPathChange={setScriptPath}
      path={scriptPath}
      pathDialogTitle={t('box.select.script', 'Select script ...')}
      pathDialogDefaultPath={gameInfo?.install.install_path}
      placeholder={scriptPath || t('box.select.script', 'Select script ...')}
      label={t(
        'setting.after-launch-script-path',
        'Select a script to run after the game exits'
      )}
      htmlId="after-launch-script-path"
    />
  )
}

export default AfterLaunchScriptPath
