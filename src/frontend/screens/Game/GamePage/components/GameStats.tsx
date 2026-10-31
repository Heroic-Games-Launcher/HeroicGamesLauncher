import { useTranslation } from 'react-i18next'
import { Clock, MonitorPlay } from 'lucide-react'
import { GameInfo } from 'common/types'
import { StatCard } from 'frontend/components/UI'
import { hasPlaytime } from 'frontend/hooks/hasPlaytime'
import { getIntlLocale } from 'frontend/helpers'

interface Props {
  gameInfo: GameInfo
}

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' }
]

function formatRelative(date: Date, locale: string) {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  let duration = (date.getTime() - Date.now()) / 1000

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }

  return formatter.format(Math.round(duration), 'year')
}

const GameStats = ({ gameInfo }: Props) => {
  const { t, i18n } = useTranslation('gamepage')
  const { totalPlayed, firstPlayed, lastPlayed } = hasPlaytime(gameInfo)
  const locale = getIntlLocale(i18n.language)

  const hours = totalPlayed ? Math.round((totalPlayed / 60) * 10) / 10 : 0
  const lastPlayedDate = lastPlayed ? new Date(lastPlayed) : null
  const firstPlayedDate = firstPlayed ? new Date(firstPlayed) : null
  const firstPlayedTitle =
    firstPlayedDate && !Number.isNaN(firstPlayedDate.getTime())
      ? `${t('game.firstPlayed', 'First Played')}: ${new Intl.DateTimeFormat(
          locale,
          { dateStyle: 'medium' }
        ).format(firstPlayedDate)}`
      : undefined

  return (
    <div className="gameStats">
      <StatCard
        glyph={Clock}
        label={t('game.totalPlayed', 'Time Played')}
        value={t('game.hoursPlayedShort', '{{hours}} hours', { hours })}
        title={firstPlayedTitle}
      />
      <StatCard
        glyph={MonitorPlay}
        label={t('game.lastPlayed', 'Last Played')}
        value={
          lastPlayedDate && !Number.isNaN(lastPlayedDate.getTime())
            ? formatRelative(lastPlayedDate, locale)
            : t('game.neverPlayed', 'Never')
        }
        title={
          lastPlayedDate && !Number.isNaN(lastPlayedDate.getTime())
            ? new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short'
              }).format(lastPlayedDate)
            : undefined
        }
      />
    </div>
  )
}

export default GameStats
