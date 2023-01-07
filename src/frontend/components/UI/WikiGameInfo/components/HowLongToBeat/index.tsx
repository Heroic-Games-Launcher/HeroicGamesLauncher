import { HowLongToBeatEntry } from 'howlongtobeat'
import React from 'react'
import { useTranslation } from 'react-i18next'
import './index.scss'

type Props = {
  info: HowLongToBeatEntry
}

export default function HowLongToBeat({ info }: Props) {
  const { t } = useTranslation('gamepage')

  if (!info) {
    return null
  }

  const { gameplayMain, gameplayMainExtra, gameplayCompletionist } = info

  return (
    <details className="howLongToBeatWrapper">
      <summary>{t('howLongToBeat', 'How Long To Beat')}</summary>
      <div className="howLongToBeat">
        <div className="howLongToBeat__circle">
          <div className="howLongToBeat__circle__title">
            {t('how-long-to-beat.main-story', 'Main Story')}
          </div>
          <div className="howLongToBeat__circle__value">
            {gameplayMain || '?'} {t('hours', 'Hours')}
          </div>
        </div>
        <div className="howLongToBeat__circle">
          <div className="howLongToBeat__circle__title">
            {t('how-long-to-beat.main-plus-extras', 'Main + Extras')}
          </div>
          <div className="howLongToBeat__circle__value">
            {gameplayMainExtra || '?'} {t('hours', 'Hours')}
          </div>
        </div>
        <div className="howLongToBeat__circle">
          <div className="howLongToBeat__circle__title">
            {t('how-long-to-beat.completionist', 'Completionist')}
          </div>
          <div className="howLongToBeat__circle__value">
            {gameplayCompletionist || '?'} {t('hours', 'Hours')}
          </div>
        </div>
      </div>
    </details>
  )
}
