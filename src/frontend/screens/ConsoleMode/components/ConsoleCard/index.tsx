import { forwardRef, useMemo } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

import { CachedImage } from 'frontend/components/UI'
import { hasStatus } from 'frontend/hooks/hasStatus'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { getProgress } from 'frontend/helpers'
import { getImageFormatting } from 'frontend/screens/Library/components/GameCard/constants'
import fallBackImage from 'frontend/assets/heroic_card.jpg'

import type { GameInfo, Status } from 'common/types'
import { GameHandle } from '../../../../helpers/ipc'

// Statuses that we surface as an overlay on the card. Anything outside this set
// (e.g. `installed`, `notInstalled`, `done`) is treated as idle.
const ACTIVE_STATUSES = new Set<Status>([
  'installing',
  'updating',
  'queued',
  'launching',
  'playing',
  'uninstalling',
  'moving',
  'repairing',
  'syncing-saves',
  'extracting',
  'redist',
  'winetricks'
])

type Props = {
  game: GameInfo
  focused: boolean
  needsUpdate: boolean
  onClick: () => void
  onMouseEnter: () => void
  onFocus: () => void
}

const ConsoleCard = forwardRef<HTMLButtonElement, Props>(function ConsoleCard(
  { game, focused, needsUpdate, onClick, onMouseEnter, onFocus },
  ref
) {
  const { t } = useTranslation()
  const gameHandle = useMemo(() => GameHandle.fromGameInfo(game), [game])
  const { status, label } = hasStatus(gameHandle)
  const [progress] = hasProgress(gameHandle)

  const isProgressing = status === 'installing' || status === 'updating'
  const percent = isProgressing
    ? Math.max(0, Math.min(100, Math.round(getProgress(progress))))
    : null
  const showStatus = !!status && ACTIVE_STATUSES.has(status)

  return (
    <button
      ref={ref}
      className={classNames('consoleCard', {
        focused,
        progressing: isProgressing
      })}
      tabIndex={focused ? 0 : -1}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      <CachedImage
        src={getImageFormatting(game.art_square, game.runner) || fallBackImage}
        alt={game.title}
        className="consoleCardArt"
      />
      {needsUpdate && !showStatus && (
        <span className="consoleCardBadge">
          {t('console.card.needsUpdate', 'Needs update')}
        </span>
      )}
      {showStatus && (
        <div className="consoleCardStatus">
          <span className="consoleCardStatusText">{label}</span>
          {isProgressing && (
            <div className="consoleCardProgress" aria-hidden>
              <div
                className="consoleCardProgressFill"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      )}
    </button>
  )
})

export default ConsoleCard
