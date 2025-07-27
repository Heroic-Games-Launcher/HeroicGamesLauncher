import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, PathSelectionBox } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { hasHelp } from 'frontend/hooks/hasHelp'

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

  const helpContent = t(
    'help.steam_path.info',
    'This path lets Heroic determine what version of Proton Steam uses, for adding non-Steam games to Steam.'
  )

  hasHelp(
    'defaultSteamPath',
    t('setting.default-steam-path', 'Default Steam path'),
    <p>{helpContent}</p>
  )

  const steamPathInfo = <InfoBox text="infobox.help">{helpContent}</InfoBox>

  return (
    <PathSelectionBox
      type="directory"
      onPathChange={setDefaultSteamPath}
      path={defaultSteamPath}
      pathDialogTitle={t('box.default-steam-path', 'Steam path.')}
      pathDialogDefaultPath={defaultSteamPath}
      label={t('setting.default-steam-path', 'Default Steam path')}
      htmlId="default_steam_path"
      noDeleteButton
      afterInput={steamPathInfo}
    />
  )
}

export default DefaultSteamPath
