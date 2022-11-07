import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputWithIconField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const DefaultSteamPath = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [defaultSteamPath, setDefaultSteamPath] = useSetting(
    'defaultSteamPath',
    ''
  )

  if (!isDefault) {
    return <></>
  }

  const steamPathInfo = (
    <InfoBox text="infobox.help">
      {t(
        'help.steam_path.info',
        'This path lets Heroic determine what version of Proton Steam uses, for adding non-Steam games to Steam.'
      )}
    </InfoBox>
  )

  return (
    <TextInputWithIconField
      label={t('setting.default-steam-path', 'Default Steam path')}
      htmlId="default_steam_path"
      value={defaultSteamPath?.replaceAll("'", '')}
      placeholder={defaultSteamPath}
      onChange={(event) => setDefaultSteamPath(event.target.value)}
      icon={
        <FontAwesomeIcon icon={faFolderOpen} data-testid="setsteampathbutton" />
      }
      onIconClick={async () =>
        window.api
          .openDialog({
            buttonLabel: t('box.choose'),
            properties: ['openDirectory'],
            title: t('box.default-steam-path', 'Steam path.'),
            defaultPath: defaultSteamPath
          })
          .then((path) => setDefaultSteamPath(path || defaultSteamPath))
      }
      afterInput={steamPathInfo}
    />
  )
}

export default DefaultSteamPath
