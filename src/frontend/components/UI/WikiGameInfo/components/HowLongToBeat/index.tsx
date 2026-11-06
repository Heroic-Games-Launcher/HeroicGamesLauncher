import { useTranslation } from 'react-i18next'
import { Flag, ListChecks, Trophy } from 'lucide-react'
import './index.scss'
import type { HeroicHowLongToBeatEntry } from 'backend/wiki_game_info/howlongtobeat/utils'
import { createNewWindow } from 'frontend/helpers'
import StatCard from '../../../StatCard'

type Props = {
  info: HeroicHowLongToBeatEntry
}

export default function HowLongToBeat({ info }: Props) {
  const { t } = useTranslation('gamepage')

  if (!info) {
    return null
  }

  const { completionist, mainExtra, mainStory, gameWebLink = '' } = info
  const openWebLink = gameWebLink
    ? () => createNewWindow(gameWebLink)
    : undefined
  const hours = (value: number) => `${value} ${t('hours', 'Hours')}`

  return (
    <div className="howLongToBeat">
      <StatCard
        glyph={Flag}
        label={t('how-long-to-beat.main-story', 'Main Story')}
        value={hours(mainStory)}
        onClick={openWebLink}
      />
      <StatCard
        glyph={ListChecks}
        label={t('how-long-to-beat.main-plus-extras', 'Main + Extras')}
        value={hours(mainExtra)}
        onClick={openWebLink}
      />
      <StatCard
        glyph={Trophy}
        label={t('how-long-to-beat.completionist', 'Completionist')}
        value={hours(completionist)}
        onClick={openWebLink}
      />
    </div>
  )
}
