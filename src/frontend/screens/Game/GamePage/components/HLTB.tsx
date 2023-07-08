import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { Speed } from '@mui/icons-material'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import HowLongToBeat from 'frontend/components/UI/WikiGameInfo/components/HowLongToBeat'

const HLTB = () => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)

  if (!wikiInfo) {
    return null
  }

  const howlongtobeat = wikiInfo.howlongtobeat

  if (!howlongtobeat) {
    return null
  }

  const hasHLTB = Boolean(howlongtobeat.gameplayMain)

  if (!hasHLTB) {
    return null
  }

  return (
    <PopoverComponent
      item={
        <div
          className="iconWithText"
          title={t('info.clickToOpen', 'Click to open')}
        >
          <Speed />
          {t('howLongToBeat', 'How Long To Beat')}
        </div>
      }
    >
      <div className="poppedElement">
        <HowLongToBeat info={howlongtobeat!} />
      </div>
    </PopoverComponent>
  )
}

export default HLTB
