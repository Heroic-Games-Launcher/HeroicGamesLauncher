import { HowLongToBeatEntry } from 'howlongtobeat'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './index.scss'

type Props = {
  title: string
}

export default function HowLongToBeat({ title }: Props) {
  const [howLongToBeatInfo, setHowLongToBeatInfo] =
    useState<HowLongToBeatEntry | null>(null)
  const { t } = useTranslation('gamepage')

  useEffect(() => {
    window.api.getHowLongToBeat(title).then((howLongToBeatInfo) => {
      if (howLongToBeatInfo) {
        setHowLongToBeatInfo(howLongToBeatInfo)
      }
    })
  }, [title])

  if (!howLongToBeatInfo) {
    return null
  }

  const { gameplayMain, gameplayMainExtra, gameplayCompletionist } =
    howLongToBeatInfo

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
