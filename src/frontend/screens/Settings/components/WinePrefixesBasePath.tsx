import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { TextInputWithIconField } from 'frontend/components/UI'
import { Path } from 'frontend/types'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'

const WinePrefixesBasePath = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isLinux = platform === 'linux'

  if (!isDefault || !isLinux) {
    return <></>
  }

  const [defaultWinePrefix, setDefaultWinePrefix] = useSetting(
    'defaultWinePrefix',
    ''
  )

  return (
    <TextInputWithIconField
      htmlId="selectDefaultWinePrefix"
      label={t('setting.defaultWinePrefix', 'Set Folder for new Wine Prefixes')}
      value={defaultWinePrefix}
      onChange={(event) => setDefaultWinePrefix(event.target.value)}
      icon={
        <FontAwesomeIcon
          icon={faFolderOpen}
          data-testid="addWinePrefix"
          title={t(
            'toolbox.settings.wineprefix',
            'Select a Folder for new Wine Prefixes'
          )}
        />
      }
      onIconClick={async () =>
        window.api
          .openDialog({
            buttonLabel: t('box.choose'),
            properties: ['openDirectory'],
            title: t('box.wineprefix'),
            defaultPath: defaultWinePrefix
          })
          .then(({ path }: Path) =>
            setDefaultWinePrefix(path ? `${path}` : defaultWinePrefix)
          )
      }
    />
  )
}

export default WinePrefixesBasePath
