import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'
import { defaultWineVersion } from '../util'

const WinePrefix = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { getSetting, runner, gameInfo } = useContext(SettingsContext)
  const wineVersion = getSetting('wineVersion', defaultWineVersion)

  const isWin = platform === 'win32'

  const [sharedWinePrefix] = useSetting('sharedWinePrefix', '')
  const [winePrefix, setWinePrefix] = useSetting('winePrefix', sharedWinePrefix)

  if (isWin || wineVersion.type === 'crossover') {
    return <></>
  }

  // Aurelia uses Steam's compatdata prefix
  if (runner === 'steam') {
    const prefix = steamCompatdataPrefix(
      gameInfo?.install.install_path,
      gameInfo?.app_name
    )
    return (
      <PathSelectionBox
        htmlId="selectWinePrefix"
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
          'Steam games run in the Proton prefix Steam uses for them, inside the Steam library the game is installed in. It cannot be changed here yet.'
        )}
      />
    )
  }

  return (
    <PathSelectionBox
      htmlId="selectWinePrefix"
      label={t('setting.wineprefix')}
      path={winePrefix}
      onPathChange={setWinePrefix}
      type="directory"
      pathDialogTitle={t('box.wineprefix')}
      pathDialogDefaultPath={winePrefix}
      noDeleteButton
      info={
        <>
          {t(
            'infobox.wine-repfix.message',
            'Wine uses what is called a WINEPREFIX to encapsulate windows applications. This prefix contains the Wine configuration files and a reproduction of the file hierarchy of C: (the main disk on a windows OS). In this reproduction of the C: drive, your game save files and dependencies installed via winetricks are stored.'
          )}{' '}
          <span className="link" onClick={() => window.api.openWinePrefixFAQ()}>
            WinePrefix FAQ
          </span>
        </>
      }
    />
  )
}

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

export default WinePrefix
