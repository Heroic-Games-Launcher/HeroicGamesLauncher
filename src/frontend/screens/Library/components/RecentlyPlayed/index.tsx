import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameInfo, RecentGame, Runner } from 'common/types'
import GamesList from '../GamesList'
import { configStore } from 'frontend/helpers/electronStores'
import useLibrary from 'frontend/hooks/useLibrary'

interface Props {
  handleModal: (appName: string, runner: Runner, gameInfo: GameInfo) => void
  onlyInstalled: boolean
}

function getRecentGames(libraries: GameInfo[], limit: number): GameInfo[] {
  const recentGames =
    (configStore.get('games.recent', []) as Array<RecentGame>) || []

  const games: GameInfo[] = []

  for (const recent of recentGames) {
    const found = libraries.find(
      (game: GameInfo) => game.app_name === recent.appName
    )
    if (found) {
      games.push(found)
      if (games.length === limit) break
    }
  }

  return games
}

export default React.memo(function RecentlyPlayed({
  handleModal,
  onlyInstalled
}: Props) {
  const { t } = useTranslation()
  const [recentGames, setRecentGames] = useState<GameInfo[]>([])
  const gamesLibrary = useLibrary({ category: 'all' })

  const loadRecentGames = async () => {
    const { maxRecentGames } = await window.api.requestAppSettings()
    const newRecentGames = getRecentGames(gamesLibrary, maxRecentGames)

    setRecentGames(newRecentGames)
  }

  useEffect(() => {
    loadRecentGames()

    const onRecentGamesUpdated = () => {
      loadRecentGames()
    }

    const recentGamesChangedRemoveListener =
      window.api.handleRecentGamesChanged(onRecentGamesUpdated)

    return () => {
      recentGamesChangedRemoveListener()
    }
  }, [gamesLibrary])

  if (!recentGames.length) {
    return null
  }

  return (
    <>
      <h5 className="libraryHeader">{t('Recent', 'Played Recently')}</h5>
      <GamesList
        library={recentGames}
        isFirstLane
        handleGameCardClick={handleModal}
        onlyInstalled={onlyInstalled}
        isRecent={true}
      />
    </>
  )
})
