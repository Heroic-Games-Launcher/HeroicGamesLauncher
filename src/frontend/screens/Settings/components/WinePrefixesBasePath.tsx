import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox } from 'frontend/components/UI'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'

const WinePrefixesBasePath = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)

  if (!isDefault || isWindows) {
    return <></>
  }

  const [defaultWinePrefix, setDefaultWinePrefix] = useSetting(
    'defaultWinePrefix',
    ''
  )

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
