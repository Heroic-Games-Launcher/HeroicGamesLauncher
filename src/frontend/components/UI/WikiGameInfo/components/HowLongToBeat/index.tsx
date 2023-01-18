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
    <>
      <h2>{t('howLongToBeat', 'How Long To Beat')}</h2>
      <details className="howLongToBeatWrapper">
        <summary>Show/hide</summary>
        <div className="howLongToBeat">
          <div className="circle green">
            <div className="circle__title">
              {t('how-long-to-beat.main-story', 'Main Story')}
            </div>
            <div className="circle__value">
              {gameplayMain || '?'} {t('hours', 'Hours')}
            </div>
          </div>
          <div className="circle green">
            <div className="circle__title">
              {t('how-long-to-beat.main-plus-extras', 'Main + Extras')}
            </div>
            <div className="circle__value">
              {gameplayMainExtra || '?'} {t('hours', 'Hours')}
            </div>
          </div>
          <div className="circle green">
            <div className="circle__title">
              {t('how-long-to-beat.completionist', 'Completionist')}
            </div>
            <div className="circle__value">
              {gameplayCompletionist || '?'} {t('hours', 'Hours')}
            </div>
          </div>
        </div>
      </details>
    </>
  )
}
