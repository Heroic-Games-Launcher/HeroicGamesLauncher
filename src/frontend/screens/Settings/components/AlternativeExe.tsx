import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import { useGameConfig } from 'frontend/hooks/config'
import { PathSelectionBox } from 'frontend/components/UI'

const AlternativeExe = () => {
  const { t } = useTranslation()
  const { gameInfo } = useContext(SettingsContext)

  const [targetExe, setTargetExe] = useGameConfig('targetExe')

  return (
    <PathSelectionBox
      type="file"
      onPathChange={setTargetExe}
      path={targetExe ?? ''}
      pathDialogTitle={t('box.select.exe', 'Select EXE')}
      pathDialogDefaultPath={gameInfo?.install.install_path}
      placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
      label={t('setting.change-target-exe', 'Select an alternative EXE to run')}
      htmlId="setinstallpath"
    />
  )
}

export default AlternativeExe
