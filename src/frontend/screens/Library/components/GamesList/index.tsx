import React, { useContext } from 'react'
import { GameInfo, Runner, SideloadGame } from 'common/types'
import cx from 'classnames'
import GameCard from '../GameCard'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import usePaginatedList from 'frontend/hooks/usePagination'

interface Props {
  library: (GameInfo | SideloadGame)[]
  layout?: string
  isFirstLane?: boolean
  handleGameCardClick: (
    app_name: string,
    runner: Runner,
    gameInfo: GameInfo
  ) => void
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
  const { gameUpdates } = useContext(ContextProvider)
  const { t } = useTranslation()

  const { infiniteScrollSentryRef, paginatedList, hasMore } = usePaginatedList(
    library,
    {
      rpp: 10,
      infinite: true
    }
  )

  const renderGameInfo = (gameInfo: GameInfo | SideloadGame) => {
    const { app_name, is_installed, runner } = gameInfo

    let is_dlc = false
    if (gameInfo.runner !== 'sideload') {
      is_dlc = gameInfo.install.is_dlc ?? false
    }

    if (is_dlc) {
      return null
    }

    if (!is_installed && onlyInstalled) {
      return null
    }

    const hasUpdate = is_installed && gameUpdates?.includes(app_name)
    return (
      <GameCard
        key={app_name}
        hasUpdate={hasUpdate}
        buttonClick={() => {
          if (gameInfo.runner !== 'sideload')
            handleGameCardClick(app_name, runner, gameInfo)
        }}
        forceCard={layout === 'grid'}
        isRecent={isRecent}
        gameInfo={gameInfo}
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
      {paginatedList.map((item) => {
        return renderGameInfo(item)
      })}
      {hasMore && (
        <div
          ref={infiniteScrollSentryRef}
          style={{ width: 100, height: 40, backgroundColor: 'transparent' }}
        />
      )}
    </div>
  )
}

export default React.memo(GamesList)
