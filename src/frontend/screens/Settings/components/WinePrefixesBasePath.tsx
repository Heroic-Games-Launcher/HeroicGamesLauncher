import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import Undo from '@mui/icons-material/Undo'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox, SvgButton } from 'frontend/components/UI'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'
import { configStore } from 'frontend/helpers/electronStores'

const factoryDefaultWinePrefixDir = `${configStore.get(
  'userHome',
  ''
)}/Games/Heroic/Prefixes`

const WinePrefixesBasePath = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isWindows = platform === 'win32'

  const [winePrefixDir, setWinePrefixDir] = useSetting(
    'defaultWinePrefixDir',
    ''
  )

  const emptyPathWarning = !winePrefixDir ? (
    <span className="smallInputInfo warning">
      {t(
        'setting.defaultWinePrefixEmpty',
        'An empty prefix folder may prevent game installations. Default: {{path}}',
        { path: factoryDefaultWinePrefixDir }
      )}
      <SvgButton
        title={t('setting.restoreDefault', 'Restore default')}
        onClick={() => setWinePrefixDir(factoryDefaultWinePrefixDir)}
      >
        <Undo />
      </SvgButton>
    </span>
  ) : undefined

  if (!isDefault || isWindows) {
    return <></>
  }

  return (
    <PathSelectionBox
      htmlId="selectDefaultWinePrefix"
      label={t('setting.defaultWinePrefix', 'Set Folder for new Wine Prefixes')}
      path={winePrefixDir}
      onPathChange={setWinePrefixDir}
      type="directory"
      pathDialogTitle={t(
        'toolbox.settings.wineprefix',
        'Select a Folder for new Wine Prefixes'
      )}
      noDeleteButton
      pathDialogDefaultPath={winePrefixDir || factoryDefaultWinePrefixDir}
      afterInput={emptyPathWarning}
    />
  )
}

export default WinePrefixesBasePath
