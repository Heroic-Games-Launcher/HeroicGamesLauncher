import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { configStore } from 'frontend/helpers/electronStores'
import { InfoBox, TextInputWithIconField } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'
import { defaultWineVersion } from '..'

const WinePrefix = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { getSetting } = useContext(SettingsContext)
  const wineVersion = getSetting('wineVersion', defaultWineVersion)

  const isWin = platform === 'win32'

  const home = configStore.get('userHome', '')
  const [winePrefix, setWinePrefix] = useSetting('winePrefix', `${home}/.wine`)
  const [defaultWinePrefix] = useSetting('defaultWinePrefix', '')

  if (isWin || wineVersion.type === 'crossover') {
    return <></>
  }

  return (
    <TextInputWithIconField
      htmlId="selectWinePrefix"
      label={t('setting.wineprefix')}
      value={winePrefix}
      onChange={(event) => setWinePrefix(event.target.value)}
      icon={
        <FontAwesomeIcon
          icon={faFolderOpen}
          data-testid="addWinePrefix"
          title={t(
            'toolbox.settings.default-wineprefix',
            'Select the default prefix folder for new configs'
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
          .then((path) => setWinePrefix(path || winePrefix))
      }
      afterInput={
        <InfoBox text={t('infobox.wine-prefix.title', 'Wine Prefix')}>
          {t(
            'infobox.wine-repfix.message',
            'Wine uses what is called a WINEPREFIX to encapsulate Windows applications. This prefix contains the Wine configuration files and a reproduction of the file hierarchy of C: (the main disk on a Windows OS). In this reproduction of the C: drive, your game save files and dependencies installed via winetricks are stored.'
          )}

          <br />
          <br />
          <a>
            <span
              className="winefaq"
              onClick={() => window.api.openWinePrefixFAQ()}
            >
              WinePrefix FAQ
            </span>
          </a>
        </InfoBox>
      }
    />
  )
}

export default WinePrefix
