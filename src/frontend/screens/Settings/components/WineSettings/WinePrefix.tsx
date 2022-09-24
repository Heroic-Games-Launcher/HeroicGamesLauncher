import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { configStore } from 'frontend/helpers/electronStores'
import { InfoBox, TextInputWithIconField } from 'frontend/components/UI'
import { Path } from 'frontend/types'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'

const WinePrefix = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)

  const isLinux = platform === 'linux'
  const [defaultWinePrefix, setDefaultWinePrefix] = useSetting<string>(
    'defaultWinePrefix',
    ''
  )

  const home = configStore.get('userHome', '')
  const [winePrefix, setWinePrefix] = useSetting<string>(
    'winePrefix',
    `${home}/.wine`
  )

  if (!isLinux || !isDefault) {
    return <></>
  }

  return (
    <>
      {isLinux && isDefault && (
        <TextInputWithIconField
          htmlId="selectDefaultWinePrefix"
          label={t(
            'setting.defaultWinePrefix',
            'Set Folder for new Wine Prefixes'
          )}
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
      )}

      {isLinux && (
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
              .then(({ path }: Path) =>
                setWinePrefix(path ? `${path}` : winePrefix)
              )
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
      )}
    </>
  )
}

export default WinePrefix
