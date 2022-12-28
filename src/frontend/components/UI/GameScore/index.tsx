import { AllData } from 'what-to-play/build/api'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './index.scss'

type Props = {
  title: string
}

export default function GameScore({ title }: Props) {
  const [gameScore, setGameScore] = useState<AllData | null>(null)
  const { t } = useTranslation('gamepage')

  useEffect(() => {
    window.api.getGameScore(title).then((score) => {
      if (score) {
        setGameScore(score)
      }
    })
  }, [title])

  if (!gameScore) {
    return null
  }

  return (
    <div>
      <p>{t('gamescore', 'Game Score')}</p>
      <div className="gamescore">
        <div className="gamescore__square">
          <div className="gamescore__square__title">
            {t('gamescore.metacritic-score', 'Metacritic Score')}
          </div>
          <div className="gamescore__square__value">
            {`${gameScore.metacritic?.metascore}` || '?'}
          </div>
        </div>
        <div className="gamescore__square">
          <div className="gamescore__square__title">
            {t('gamescore.metacritic-userscore', 'Metacritic Userscore')}
          </div>
          <div className="gamescore__square__value">
            {`${gameScore.metacritic?.userscore}` || '?'}
          </div>
        </div>
        <div className="gamescore__square">
          <div className="gamescore__square__title">
            {t('gamescore.steam-score', 'Steam Score')}
          </div>
          <div className="gamescore__square__value">
            {`${gameScore.steam?.allTimeScore}` || '?'}
          </div>
        </div>
      </div>
    </div>
  )
}
