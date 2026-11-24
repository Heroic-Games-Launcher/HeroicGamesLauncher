import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { Alert, PathSelectionBox } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'
import { defaultWineVersion } from '../util'

const WinePrefix = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { getSetting, gameInfo } = useContext(SettingsContext)
  const wineVersion = getSetting('wineVersion', defaultWineVersion)

  const isWin = platform === 'win32'

  const [sharedWinePrefix] = useSetting('sharedWinePrefix', '')
  const [winePrefix, setWinePrefix] = useSetting('winePrefix', sharedWinePrefix)

  if (isWin || wineVersion.type === 'crossover') {
    return <></>
  }

  return (
    <>
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
            <span
              className="link"
              onClick={() => window.api.openWinePrefixFAQ()}
            >
              WinePrefix FAQ
            </span>
          </>
        }
      />
      {gameInfo?.cloud_save_enabled ? (
        <Alert variant="warning">
          {t(
            'setting.wineprefix-save-warning',
            'Changing the Wine prefix or the Wine/Proton version can make Heroic lose track of where this game saves its data. Check the Cloud Saves tab before launching the game.'
          )}
        </Alert>
      ) : null}
    </>
  )
}

export default WinePrefix
