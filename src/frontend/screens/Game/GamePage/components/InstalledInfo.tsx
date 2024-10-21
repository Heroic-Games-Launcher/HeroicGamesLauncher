import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { DownloadDone } from '@mui/icons-material'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import { GameInfo } from 'common/types'
import ContextProvider from 'frontend/state/ContextProvider'

interface Props {
  gameInfo: GameInfo
}

const InstalledInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()
  const { gameSettings, runner, is } = useContext(GameContext)
  const { experimentalFeatures } = useContext(ContextProvider)

  if (!gameInfo.is_installed) {
    return null
  }

  if (!gameSettings) {
    return null
  }

  const isSideloaded = runner === 'sideload'
  const isThirdParty = !!gameInfo.thirdPartyManagedApp

  const {
    install: { platform: installPlatform },
    canRunOffline,
    folder_name
  } = gameInfo

  if (installPlatform === 'Browser') {
    return (
      <div style={{ textTransform: 'capitalize' }}>
        <b>{t('info.installedPlatform', 'Installed Platform')}:</b>{' '}
        {installPlatform}
      </div>
    )
  }

  let install_path: string | undefined
  let install_size: string | undefined
  let version: string | undefined

  if (!isSideloaded) {
    install_path = gameInfo.install.install_path
    install_size = gameInfo.install.install_size
    version = gameInfo.install.version
  }

  const appLocation = install_path || folder_name

  const { wineVersion, winePrefix, wineCrossoverBottle } = gameSettings

  let wineName = ''
  let wineType = ''

  if (!is.win) {
    let wine = wineVersion.name.replace('Wine - ', '').replace('Proton - ', '')
    if (wine.includes('Default')) {
      wine = wine.split('-')[0]
    }
    wineName = wine
    wineType =
      wineVersion.type === 'crossover' ? wineCrossoverBottle : winePrefix
  }

  const info = (
    <>
      {!isSideloaded && !isThirdParty && (
        <div>
          <b>{t('info.size')}:</b> {install_size}
        </div>
      )}
      <div style={{ textTransform: 'capitalize' }}>
        <b>{t('info.installedPlatform', 'Installed Platform')}:</b>{' '}
        {installPlatform === 'osx' ? 'MacOS' : installPlatform}
      </div>
      {!isSideloaded && !isThirdParty && (
        <div>
          <b>{t('info.version')}:</b> {version}
        </div>
      )}
      <div>
        <b>{t('info.canRunOffline', 'Online Required')}:</b>{' '}
        {t(canRunOffline ? 'box.no' : 'box.yes')}
      </div>
      {isThirdParty && (
        <div>
          <b>{t('info.third-party-app', 'Third-Party Manager')}</b>{' '}
          {gameInfo.isEAManaged ? 'EA app' : gameInfo.thirdPartyManagedApp}
        </div>
      )}
      {!isThirdParty && (
        <div
          className="clickable"
          onClick={() =>
            appLocation !== undefined ? window.api.openFolder(appLocation) : {}
          }
        >
          <b>{t('info.path')}:</b>{' '}
          <div className="truncatedPath">{appLocation}</div>
        </div>
      )}
      {!is.win && !is.native && (
        <>
          <div>
            <b>Wine:</b> {wineName}
          </div>
          {wineVersion && wineType === 'crossover' ? (
            <div>
              <b>{t2('setting.winecrossoverbottle', 'Bottle')}:</b>{' '}
              <div className="truncatedPath">{winePrefix}</div>
            </div>
          ) : (
            <div
              className="clickable"
              onClick={() => window.api.openFolder(winePrefix)}
            >
              <b>{t2('setting.wineprefix', 'WinePrefix')}:</b>{' '}
              <div className="truncatedPath">{winePrefix}</div>
            </div>
          )}
        </>
      )}
      <br />
    </>
  )

  if (experimentalFeatures.enableNewDesign) {
    return info
  }

  return (
    <PopoverComponent
      item={
        <span
          title={t('info.clickToOpen', 'Click to open')}
          className="iconWithText"
        >
          <DownloadDone />
          {t('info.installedInfo', 'Installed Information')}
        </span>
      }
    >
      <div className="poppedElement">{info}</div>
    </PopoverComponent>
  )
}

export default InstalledInfo
