import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { InfoBox, PathSelectionBox } from 'frontend/components/UI'

const AlternativeExe = () => {
  const { t } = useTranslation()
  const { isDefault, runner, gameInfo } = useContext(SettingsContext)

  const [targetExe, setTargetExe] = useSetting('targetExe', '')

  if (isDefault || runner === 'sideload') {
    return <></>
  }

  let macAppWarning = <></>
  if (targetExe.endsWith('.app')) {
    const pathParts = targetExe.split('/')
    macAppWarning = (
      <InfoBox
        text={t(
          'setting.altExeMacAppWarning.title',
          'Warning! you selected a .app file'
        )}
      >
        {t('setting.altExeMacAppWarning.details', {
          defaultValue:
            'You should select the relevant executable file inside ../{{appPath}}/Contents/MacOS/<executable> instead',
          appPath: pathParts[pathParts.length - 1]
        })}
      </InfoBox>
    )
  }

  return (
    <PathSelectionBox
      type="file"
      onPathChange={setTargetExe}
      path={targetExe}
      pathDialogTitle={t('box.select.exe', 'Select EXE')}
      pathDialogDefaultPath={gameInfo?.install.install_path}
      placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
      label={t('setting.change-target-exe', 'Select an alternative EXE to run')}
      htmlId="setinstallpath"
      afterInput={macAppWarning}
    />
  )
}

export default AlternativeExe
