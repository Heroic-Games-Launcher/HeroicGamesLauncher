import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { Star } from '@mui/icons-material'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import GameScore from 'frontend/components/UI/WikiGameInfo/components/GameScore'
import { GameInfo } from 'common/types'
import { useGlobalConfig } from 'frontend/hooks/config'

interface Props {
  gameInfo: GameInfo
}

const Scores = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)
  const [enableNewDesign] = useGlobalConfig('enableNewDesign')

  if (!wikiInfo) {
    return null
  }

  const pcgamingwiki = wikiInfo.pcgamingwiki

  if (!pcgamingwiki) {
    return null
  }

  const hasScores =
    pcgamingwiki?.metacritic.score ||
    pcgamingwiki?.igdb.score ||
    pcgamingwiki?.opencritic.score

  if (!hasScores) {
    return null
  }

  if (enableNewDesign) {
    return <GameScore info={pcgamingwiki} title={gameInfo.title} />
  }

  return (
    <PopoverComponent
      item={
        <div
          className="iconWithText"
          title={t('info.clickToOpen', 'Click to open')}
        >
          <Star />
          {t('info.game-scores', 'Game Scores')}
        </div>
      }
    >
      <div className="poppedElement">
        <GameScore info={pcgamingwiki} title={gameInfo.title} />
      </div>
    </PopoverComponent>
  )
}

export default Scores
