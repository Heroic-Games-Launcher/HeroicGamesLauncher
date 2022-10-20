import React, { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../../SettingsContext'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import Backspace from '@mui/icons-material/Backspace'
import useSetting from 'frontend/hooks/useSetting'
import { getGameInfo } from 'frontend/helpers'
import { Path } from 'frontend/types'
import { TextInputWithIconField } from 'frontend/components/UI'

const AlternativeExe = () => {
  const { t } = useTranslation()
  const { isDefault, appName, runner } = useContext(SettingsContext)

  const [targetExe, setTargetExe] = useSetting<string>('targetExe', '')

  if (isDefault) {
    return <></>
  }

  const handleTargetExe = useCallback(async () => {
    if (!targetExe.length) {
      const gameinfo = await getGameInfo(appName, runner)

      window.api
        .openDialog({
          buttonLabel: t('box.select.button', 'Select'),
          properties: ['openFile'],
          title: t('box.select.exe', 'Select EXE'),
          defaultPath: gameinfo.install.install_path
        })
        .then(({ path }: Path) => setTargetExe(path || targetExe))
    }
    setTargetExe('')
  }, [targetExe])

  return (
    <TextInputWithIconField
      label={t('setting.change-target-exe', 'Select an alternative EXE to run')}
      htmlId="setinstallpath"
      value={targetExe.replaceAll("'", '')}
      placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
      onChange={(event) => setTargetExe(event.target.value)}
      icon={
        !targetExe.length ? (
          <CreateNewFolder data-testid="setinstallpathbutton" />
        ) : (
          <Backspace data-testid="setEpicSyncPathBackspace" />
        )
      }
      onIconClick={handleTargetExe}
    />
  )
}

export default AlternativeExe
