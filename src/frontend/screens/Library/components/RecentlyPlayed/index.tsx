import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, Runner } from 'common/types'
import GamesList from '../GamesList'
import { configStore } from 'frontend/helpers/electronStores'

interface Props {
  handleModal: (appName: string, runner: Runner, gameInfo: GameInfo) => void
  onlyInstalled: boolean
}

function getRecentGames(libraries: GameInfo[], limit: number): GameInfo[] {
  const recentGames = configStore.get('games.recent', [])

  const games: GameInfo[] = []

  for (const recent of recentGames) {
    const found = libraries.find((game) => game.app_name === recent.appName)
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
  const { epic, gog, sideloadedLibrary, amazon } = useContext(ContextProvider)
  const [recentGames, setRecentGames] = useState<GameInfo[]>([])

  const loadRecentGames = async () => {
    const { maxRecentGames } = await window.api.requestAppSettings()
    const newRecentGames = getRecentGames(
      [
        ...epic.library,
        ...gog.library,
        ...sideloadedLibrary,
        ...amazon.library
      ],
      maxRecentGames
    )

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
  }, [epic.library, gog.library, amazon.library, sideloadedLibrary])

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
