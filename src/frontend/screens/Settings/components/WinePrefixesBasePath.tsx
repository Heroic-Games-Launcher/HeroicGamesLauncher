import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { Alert, Button, PathSelectionBox } from 'frontend/components/UI'
import { configStore } from 'frontend/helpers/electronStores'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'

const WinePrefixesBasePath = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isWindows = platform === 'win32'

  const [defaultWinePrefixDir, setDefaultWinePrefixDir] = useSetting(
    'defaultWinePrefixDir',
    ''
  )

  if (!isDefault || isWindows) {
    return <></>
  }

  const userHome = configStore.get('userHome', '')
  const defaultPath = userHome ? `${userHome}/Games/Heroic/Prefixes` : ''
  const isEmpty = !defaultWinePrefixDir.trim()

  return (
    <>
      <PathSelectionBox
        htmlId="selectDefaultWinePrefix"
        label={t(
          'setting.defaultWinePrefix',
          'Set folder for new Wine prefixes'
        )}
        path={defaultWinePrefixDir}
        onPathChange={setDefaultWinePrefixDir}
        type="directory"
        pathDialogTitle={t(
          'toolbox.settings.wineprefix',
          'Select a folder for new Wine prefixes'
        )}
        noDeleteButton
        pathDialogDefaultPath={defaultWinePrefixDir || defaultPath}
      />
      {isEmpty && (
        <Alert
          variant="warning"
          actions={
            defaultPath ? (
              <Button
                size="sm"
                onClick={() => setDefaultWinePrefixDir(defaultPath)}
              >
                {t('setting.defaultWinePrefixEmpty.restore', 'Restore default')}
              </Button>
            ) : undefined
          }
        >
          {defaultPath
            ? t(
                'setting.defaultWinePrefixEmpty.warning',
                'Leaving this folder empty may cause problems when installing games. The default path is "{{defaultPath}}".',
                { defaultPath }
              )
            : t(
                'setting.defaultWinePrefixEmpty.warningNoDefault',
                'Leaving this folder empty may cause problems when installing games.'
              )}
        </Alert>
      )}
    </>
  )
}

export default WinePrefixesBasePath
