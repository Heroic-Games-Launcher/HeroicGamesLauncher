import { useTranslation } from 'react-i18next'
import './index.scss'
import type { HeroicHowLongToBeatEntry } from 'backend/wiki_game_info/howlongtobeat/utils'
import { createNewWindow } from 'frontend/helpers'

type Props = {
  info: HeroicHowLongToBeatEntry
}

export default function HowLongToBeat({ info }: Props) {
  const { t } = useTranslation('gamepage')

  if (!info) {
    return null
  }

  const { completionist, mainExtra, mainStory, gameWebLink = '' } = info

  return (
    <>
      <div className="howLongToBeat">
        <div
          className="circle green"
          onClick={() => createNewWindow(gameWebLink)}
        >
          <div className="circle__title">
            {t('how-long-to-beat.main-story', 'Main Story')}
          </div>
          <div className="circle__value">
            {mainStory} {t('hours', 'Hours')}
          </div>
        </div>
        <div
          className="circle green"
          onClick={() => createNewWindow(gameWebLink)}
        >
          <div className="circle__title">
            {t('how-long-to-beat.main-plus-extras', 'Main + Extras')}
          </div>
          <div className="circle__value">
            {mainExtra} {t('hours', 'Hours')}
          </div>
        </div>
        <div
          className="circle green"
          onClick={() => createNewWindow(gameWebLink)}
        >
          <div className="circle__title">
            {t('how-long-to-beat.completionist', 'Completionist')}
          </div>
          <div className="circle__value">
            {completionist} {t('hours', 'Hours')}
          </div>
        </div>
      </div>
    </>
  )
}
