import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAwaited } from 'frontend/hooks/useAwaited'
import type { GameHandle } from 'frontend/helpers/ipc'

type Props = {
  game: GameHandle
}

function ReleaseDate({ game }: Props) {
  const { t, i18n } = useTranslation()
  const releaseDate = useAwaited(window.api.game.getReleaseDate, game)

  const formatted = useMemo(() => {
    if (!releaseDate) return null
    return Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).format(releaseDate)
  }, [i18n.language, releaseDate])

  if (!formatted) {
    return null
  }

  return (
    <div className="releaseDate">
      {t('label.releaseDate', 'Release Date')}: {formatted}
    </div>
  )
}

export default ReleaseDate
