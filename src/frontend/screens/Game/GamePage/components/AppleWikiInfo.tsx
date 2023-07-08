import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { WineBar } from '@mui/icons-material'
import { createNewWindow } from 'frontend/helpers'
import { GameInfo } from 'common/types'

interface Props {
  gameInfo: GameInfo
}

const AppleWikiInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)

  if (!wikiInfo) {
    return null
  }

  const applegamingwiki = wikiInfo.applegamingwiki

  if (!applegamingwiki) {
    return null
  }

  const hasAppleInfo = applegamingwiki?.crossoverRating

  if (!hasAppleInfo) {
    return null
  }

  return (
    <a
      role="button"
      className="iconWithText"
      title={t('info.clickToOpen', 'Click to open')}
      onClick={() => {
        if (applegamingwiki.crossoverLink) {
          createNewWindow(
            `https://www.codeweavers.com/compatibility/crossover/${applegamingwiki.crossoverLink}`
          )
        } else {
          createNewWindow(
            `https://www.codeweavers.com/compatibility?browse=&app_desc=&company=&rating=&platform=&date_start=&date_end=&name=${gameInfo.title}&search=app#results`
          )
        }
      }}
    >
      <WineBar />
      {t('info.apple-gaming-wiki', 'AppleGamingWiki Rating')}:{' '}
      {applegamingwiki.crossoverRating.charAt(0).toUpperCase() +
        applegamingwiki.crossoverRating.slice(1)}
    </a>
  )
}

export default AppleWikiInfo
