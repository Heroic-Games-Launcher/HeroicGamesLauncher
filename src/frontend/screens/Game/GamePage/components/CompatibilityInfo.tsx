import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import {
  CheckCircle,
  DoNotDisturb,
  Error,
  HelpOutline,
  WineBar
} from '@mui/icons-material'
import { createNewWindow } from 'frontend/helpers'
import { GameInfo } from 'common/types'

interface Props {
  gameInfo: GameInfo
}

const CompatibilityInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)

  if (!wikiInfo) {
    return null
  }

  const steamInfo = wikiInfo.steamInfo

  if (!steamInfo) {
    return null
  }

  const hasProtonDB = steamInfo?.compatibilityLevel

  // check if we got a number. zero is also valid.
  const hasSteamDeckCompat = Number.isFinite(steamInfo?.steamDeckCatagory)
  const steamLevelNames = [
    // use outline for help icon because steam does it aswell
    // colors come from the steam verified icons
    <HelpOutline
      key={0}
      style={{ marginLeft: '5px', cursor: 'default', color: '#a0a5a8' }}
    />,
    <DoNotDisturb
      key={1}
      style={{ marginLeft: '5px', cursor: 'default', color: '#a0a5a8' }}
    />,
    <Error
      key={2}
      style={{ marginLeft: '5px', cursor: 'default', color: '#ffc82c' }}
    />,
    <CheckCircle
      key={3}
      style={{ marginLeft: '5px', cursor: 'default', color: '#58be42' }}
    />
  ]

  let protonDBurl = `https://www.protondb.com/search?q=${gameInfo.title}`
  if (wikiInfo.pcgamingwiki?.steamID) {
    protonDBurl = `https://www.protondb.com/app/${wikiInfo.pcgamingwiki?.steamID}`
  }

  return (
    <>
      {hasProtonDB && (
        <a
          role="button"
          onClick={() => {
            createNewWindow(protonDBurl)
          }}
          title={t('info.clickToOpen', 'Click to open')}
          className="iconWithText"
        >
          <WineBar />
          {t(
            'info.protondb-compatibility-info',
            'Proton Compatibility Tier'
          )}:{' '}
          {steamInfo!.compatibilityLevel!.charAt(0).toUpperCase() +
            steamInfo!.compatibilityLevel!.slice(1)}
        </a>
      )}
      {hasSteamDeckCompat && (
        <a className="iconWithText" style={{ cursor: 'default' }}>
          <WineBar />
          {t(
            'info.steamdeck-compatibility-info',
            'SteamDeck Compatibility'
          )}: {steamLevelNames[steamInfo?.steamDeckCatagory ?? 3]}
        </a>
      )}
    </>
  )
}

export default CompatibilityInfo
