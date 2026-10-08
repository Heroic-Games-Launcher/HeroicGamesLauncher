import { useTranslation } from 'react-i18next'
import { Clock, MonitorPlay } from 'lucide-react'
import { GameInfo } from 'common/types'
import { StatCard } from 'frontend/components/UI'
import { hasPlaytime } from 'frontend/hooks/hasPlaytime'

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

function formatRelative(date: Date) {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
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
  const { t } = useTranslation('gamepage')
  const { totalPlayed, firstPlayed, lastPlayed } = hasPlaytime(gameInfo)

  const hours = totalPlayed ? Math.round((totalPlayed / 60) * 10) / 10 : 0
  const lastPlayedDate = lastPlayed ? new Date(lastPlayed) : null
  const firstPlayedTitle = firstPlayed
    ? `${t('game.firstPlayed', 'First Played')}: ${new Intl.DateTimeFormat(
        undefined,
        { dateStyle: 'medium' }
      ).format(new Date(firstPlayed))}`
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
            ? formatRelative(lastPlayedDate)
            : t('game.neverPlayed', 'Never')
        }
        title={
          lastPlayedDate && !Number.isNaN(lastPlayedDate.getTime())
            ? new Intl.DateTimeFormat(undefined, {
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
