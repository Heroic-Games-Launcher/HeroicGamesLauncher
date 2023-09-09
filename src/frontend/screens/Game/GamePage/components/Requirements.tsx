import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { Hardware } from '@mui/icons-material'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import GameRequirements from '../../GameRequirements'

const Requirements = () => {
  const { t } = useTranslation('gamepage')
  const { gameExtraInfo } = useContext(GameContext)

  if (!gameExtraInfo) {
    return null
  }

  const hasRequirements = (gameExtraInfo.reqs || []).length > 0

  if (!hasRequirements) {
    return null
  }

  return (
    <PopoverComponent
      item={
        <div
          className="iconWithText"
          title={t('info.clickToOpen', 'Click to open')}
        >
          <Hardware />
          {t('game.requirements', 'Requirements')}
        </div>
      }
    >
      <div className="poppedElement">
        <GameRequirements reqs={gameExtraInfo.reqs} />
      </div>
    </PopoverComponent>
  )
}

export default Requirements
