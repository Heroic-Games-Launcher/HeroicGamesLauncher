import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { useGlobalConfig } from 'frontend/hooks/config'
import { PathSelectionBox } from 'frontend/components/UI'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'

const WinePrefixesBasePath = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isWindows = platform === 'win32'

  if (!isDefault || isWindows) {
    return <></>
  }

  const [defaultWinePrefix, setDefaultWinePrefix, defaultPrefixPathFetched] =
    useGlobalConfig('winePrefixBasePath')

  if (!defaultPrefixPathFetched) return <></>

  return (
    <PathSelectionBox
      htmlId="selectDefaultWinePrefix"
      label={t('setting.defaultWinePrefix', 'Set Folder for new Wine Prefixes')}
      path={defaultWinePrefix}
      onPathChange={setDefaultWinePrefix}
      type="directory"
      pathDialogTitle={t(
        'toolbox.settings.wineprefix',
        'Select a Folder for new Wine Prefixes'
      )}
      noDeleteButton
      pathDialogDefaultPath={defaultWinePrefix}
    />
  )
}

export default WinePrefixesBasePath
