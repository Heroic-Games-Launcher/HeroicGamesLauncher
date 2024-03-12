import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, Runner } from 'common/types'
import GamesList from '../GamesList'
import { configStore } from 'frontend/helpers/electronStores'

interface Props {
  handleModal: (appName: string, runner: Runner, gameInfo: GameInfo) => void
  onlyInstalled: boolean
  showHidden: boolean
}

function getRecentGames(
  libraries: GameInfo[],
  limit: number,
  onlyInstalled: boolean
): GameInfo[] {
  const recentGames = configStore.get('games.recent', [])

  const games: GameInfo[] = []

  for (const recent of recentGames) {
    const found = libraries.find((game) => game.app_name === recent.appName)
    if (found) {
      if (onlyInstalled && !found.is_installed) continue
      if (found.install.is_dlc) continue
      games.push(found)
      if (games.length === limit) break
    }
  }

  return games
}

export default React.memo(function RecentlyPlayed({
  handleModal,
  onlyInstalled,
  showHidden
}: Props) {
  const { t } = useTranslation()
  const { epic, gog, sideloadedLibrary, amazon } = useContext(ContextProvider)
  const [recentGames, setRecentGames] = useState<GameInfo[]>([])

  const hiddenGames = useContext(ContextProvider).hiddenGames

  const loadRecentGames = async () => {
    const hiddenAppNames = hiddenGames.list.map((game) => game.appName)
    const { maxRecentGames } = await window.api.config.global.get()
    let newRecentGames = getRecentGames(
      [
        ...epic.library,
        ...gog.library,
        ...sideloadedLibrary,
        ...amazon.library
      ],
      maxRecentGames,
      onlyInstalled
    )
    if (!showHidden) {
      newRecentGames = newRecentGames.filter(
        (game: GameInfo) => !hiddenAppNames.includes(game.app_name)
      )
    }
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
  }, [
    epic.library,
    gog.library,
    amazon.library,
    sideloadedLibrary,
    hiddenGames,
    showHidden
  ])

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
