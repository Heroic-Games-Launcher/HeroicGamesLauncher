import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { useSharedConfig } from 'frontend/hooks/config'
import { InfoBox, PathSelectionBox } from 'frontend/components/UI'

const WinePrefix = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)

  const isWin = platform === 'win32'

  const [winePrefix, setWinePrefix, winePrefixFetched] =
    useSharedConfig('winePrefix')
  const [wineVersion, , wineVersionFetched] = useSharedConfig('wineVersion')

  if (!winePrefixFetched || !wineVersionFetched) return <></>

  if (isWin || wineVersion.type === 'crossover') {
    return <></>
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
