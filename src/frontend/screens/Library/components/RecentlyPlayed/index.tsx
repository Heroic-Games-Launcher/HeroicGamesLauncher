import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, RecentGame, Runner } from 'common/types'
import GamesList from '../GamesList'
import { configStore } from 'frontend/helpers/electronStores'
import { ModalState } from '../..'

interface Props {
  onlyInstalled: boolean
  setShowModal: React.Dispatch<React.SetStateAction<ModalState>>
  handleModal: (
    appName: string,
    runner: Runner,
    gameInfo: GameInfo | null,
    callback: (value: React.SetStateAction<ModalState>) => void
  ) => void
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
  onlyInstalled,
  setShowModal
}: Props) {
  const { t } = useTranslation()
  const { epic, gog, sideloadedLibrary } = useContext(ContextProvider)
  const [recentGames, setRecentGames] = useState<GameInfo[]>([])

  const loadRecentGames = async () => {
    const { maxRecentGames } = await window.api.requestAppSettings()
    const newRecentGames = getRecentGames(
      [...epic.library, ...gog.library, ...sideloadedLibrary],
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
  }, [epic.library, gog.library, sideloadedLibrary])

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
        setShowModal={setShowModal}
      />
    </>
  )
})
