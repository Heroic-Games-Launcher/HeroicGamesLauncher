import React from 'react'
import { Runner } from 'common/types'
import cx from 'classnames'
import GameCard from '../GameCard'
import { useTranslation } from 'react-i18next'
import { Game } from '../../../../state/new/Game'

interface Props {
  library: Game[]
  layout?: string
  isFirstLane?: boolean
  handleGameCardClick?: (app_name: string, runner: Runner, game: Game) => void
  onlyInstalled?: boolean
  isRecent?: boolean
}

const GamesList = ({
  library = [],
  layout = 'grid',
  handleGameCardClick,
  isFirstLane = false,
  onlyInstalled = false,
  isRecent = false
}: Props): JSX.Element => {
  const { t } = useTranslation()

  const renderGame = (game: Game) => {
    const {
      app_name,
      is_installed,
      runner,
      install: { is_dlc }
    } = game.data

    if (is_dlc) {
      return null
    }
    if (!is_installed && onlyInstalled) {
      return null
    }

    const { hasUpdate } = game

    return (
      <GameCard
        key={app_name}
        hasUpdate={hasUpdate}
        buttonClick={() => handleGameCardClick?.(app_name, runner, game)}
        forceCard={layout === 'grid'}
        isRecent={isRecent}
        game={game}
        layout={layout}
      />
    )
  }

  return (
    <div
      style={
        !library.length
          ? {
              backgroundColor: 'transparent'
            }
          : {}
      }
      className={cx({
        gameList: layout === 'grid',
        gameListLayout: layout === 'list',
        firstLane: isFirstLane
      })}
    >
      {layout === 'list' && (
        <div className="gameListHeader">
          <span>{t('game.title', 'Game Title')}</span>
          <span>{t('game.status', 'Status')}</span>
          <span>{t('game.store', 'Store')}</span>
          <span>{t('wine.actions', 'Action')}</span>
        </div>
      )}
      {library.map((item) => {
        return renderGame(item)
      })}
    </div>
  )
}

export default React.memo(GamesList)
