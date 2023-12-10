import React, { useContext } from 'react'
import GameContext from '../../GameContext'
import { useTranslation } from 'react-i18next'

const Description = () => {
  const { t } = useTranslation('gamepage')
  const { gameExtraInfo, runner } = useContext(GameContext)

  let description = ''

  if (runner !== 'sideload') {
    description =
      gameExtraInfo?.about?.shortDescription ||
      gameExtraInfo?.about?.description ||
      t('generic.noDescription', 'No description available')
  }

  return <div className="summary">{description}</div>
}

export default Description
