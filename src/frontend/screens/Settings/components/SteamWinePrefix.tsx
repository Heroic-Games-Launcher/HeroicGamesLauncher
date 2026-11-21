import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { PathSelectionBox } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'

/** Steam compatdata prefix for an install. */
export function steamCompatdataPrefix(
  installPath?: string,
  appId?: string
): string {
  if (!installPath || !appId) return ''
  const normalized = installPath.replaceAll('\\', '/')
  const marker = '/steamapps/common/'
  const at = normalized.lastIndexOf(marker)
  if (at === -1) return ''
  return `${normalized.slice(0, at)}/steamapps/compatdata/${appId}/pfx`
}

/** Read-only Proton prefix Aurelia uses. */
const SteamWinePrefix = () => {
  const { t } = useTranslation()
  const { gameInfo } = useContext(SettingsContext)
  const prefix = steamCompatdataPrefix(
    gameInfo?.install.install_path,
    gameInfo?.app_name
  )
  if (!prefix) return <></>

  return (
    <PathSelectionBox
      htmlId="steamWinePrefix"
      label={t('setting.wineprefix')}
      path={prefix}
      onPathChange={() => undefined}
      type="directory"
      pathDialogTitle={t('box.wineprefix')}
      canEditPath={false}
      noDeleteButton
      disabled
      info={t(
        'infobox.steam-wineprefix',
        'When this game runs through Proton, it uses the prefix Steam uses for it, inside the Steam library the game is installed in. It cannot be changed here yet.'
      )}
    />
  )
}

export default SteamWinePrefix
