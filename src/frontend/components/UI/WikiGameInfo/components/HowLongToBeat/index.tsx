import React from 'react'
import { useTranslation } from 'react-i18next'
import './index.scss'
import type { HowLongToBeatEntry } from 'backend/wiki_game_info/howlongtobeat/utils'

type Props = {
  info: HowLongToBeatEntry
}

export default function HowLongToBeat({ info }: Props) {
  const { t } = useTranslation('gamepage')

  if (!info) {
    return null
  }

  const { comp_100, comp_plus, comp_main } = info

  return (
    <>
      <div className="howLongToBeat">
        <div className="circle green">
          <div className="circle__title">
            {t('how-long-to-beat.main-story', 'Main Story')}
          </div>
          <div className="circle__value">
            {Math.round(comp_main / 60 / 60)} {t('hours', 'Hours')}
          </div>
        </div>
        <div className="circle green">
          <div className="circle__title">
            {t('how-long-to-beat.main-plus-extras', 'Main + Extras')}
          </div>
          <div className="circle__value">
            {Math.round(comp_plus / 60 / 60)} {t('hours', 'Hours')}
          </div>
        </div>
        <div className="circle green">
          <div className="circle__title">
            {t('how-long-to-beat.completionist', 'Completionist')}
          </div>
          <div className="circle__value">
            {Math.round(comp_100 / 60 / 60)} {t('hours', 'Hours')}
          </div>
        </div>
      </div>
    </>
  )
}
