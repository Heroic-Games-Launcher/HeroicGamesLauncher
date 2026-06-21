import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAwaited } from 'frontend/hooks/useAwaited'
import type { GameHandle } from 'frontend/helpers/ipc'

interface Props {
  game: GameHandle
}

function Description({ game }: Props) {
  const { t } = useTranslation('gamepage')
  const maybeDescription = useAwaited(window.api.game.getDescription, game)

  const description = useMemo(
    () =>
      maybeDescription ??
      t('generic.noDescription', 'No description available'),
    [t, maybeDescription]
  )

  return <div className="summary">{description}</div>
}

export default Description
