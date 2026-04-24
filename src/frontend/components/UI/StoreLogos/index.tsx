import './index.css'

import { GameInfo, Runner } from 'common/types'
import { getStoreName } from 'frontend/helpers'
import EpicLogo from 'frontend/assets/epic-logo.svg?react'
import GOGLogo from 'frontend/assets/gog-logo.svg?react'
import SideLoad from 'frontend/assets/heroic-icon.svg?react'
import AmazonLogo from 'frontend/assets/amazon-logo.svg?react'
import ZoomLogo from 'frontend/assets/zoom-logo.svg?react'

type Props = {
  runner?: Runner
  runners?: Runner[]
  games?: GameInfo[]
  className?: string
  selectedRunner?: Runner
  onGameClick?: (game: GameInfo) => void
}

export default function StoreLogos({
  runner,
  runners,
  games,
  className = 'store-icon',
  selectedRunner,
  onGameClick
}: Props) {
  const runnersToShow = Array.from(
    new Set(runners || (runner ? [runner] : []))
  )

  const selectableGames =
    onGameClick && games && games.length > 1 ? games : undefined

  const renderLogo = (store: Runner) => {
    switch (store) {
      case 'legendary':
        return <EpicLogo />
      case 'gog':
        return <GOGLogo />
      case 'nile':
        return <AmazonLogo />
      case 'zoom':
        return <ZoomLogo />
      default:
        return <SideLoad />
    }
  }

  return (
    <div className={`store-logos-container ${className}`.trim()}>
      {selectableGames
        ? selectableGames.map((game, index) => {
            const isSelected = selectedRunner === game.runner

            return (
              <button
                key={`${game.runner}-${game.app_name}-${index}`}
                type="button"
                className={`store-logo-badge store-logo-button ${isSelected ? 'selected' : ''}`.trim()}
                title={getStoreName(game.runner, 'Other')}
                onClick={() => onGameClick?.(game)}
                aria-pressed={isSelected}
              >
                {renderLogo(game.runner)}
              </button>
            )
          })
        : runnersToShow.map((store, index) => (
            <span
              key={`${store}-${index}`}
              className="store-logo-badge"
              title={getStoreName(store, 'Other')}
            >
              {renderLogo(store)}
            </span>
          ))}
    </div>
  )
}
