import { Clock } from 'lucide-react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Icon from '../Icon'
import './index.css'

interface PlaytimeProps {
  minutes?: number
  lastPlayed?: string
  className?: string
}

export default function Playtime({
  minutes,
  lastPlayed,
  className
}: PlaytimeProps) {
  const { t } = useTranslation('gamepage')

  if (!minutes && !lastPlayed) {
    return null
  }

  const hours = minutes ? Math.round((minutes / 60) * 10) / 10 : null
  const lastPlayedDate = lastPlayed
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(lastPlayed)
      )
    : null

  return (
    <span className={classNames('Playtime', className)}>
      {hours !== null && (
        <span className="Playtime__entry">
          <Icon glyph={Clock} size="xs" />
          {t('game.hoursPlayed', '{{hours}} hours played', { hours })}
        </span>
      )}
      {lastPlayedDate && (
        <span className="Playtime__entry Playtime__last">
          {t('game.lastPlayed', 'Last Played')}: {lastPlayedDate}
        </span>
      )}
    </span>
  )
}
