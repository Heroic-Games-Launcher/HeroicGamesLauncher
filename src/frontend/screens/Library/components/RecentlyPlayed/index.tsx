import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getRecentGames } from 'frontend/helpers/library'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, GameStatus, Runner } from 'common/types'
import { GamesList } from '../GamesList'

interface Props {
  handleModal: (appName: string, runner: Runner) => void
  onlyInstalled: boolean
}

export default function RecentlyPlayed({ handleModal, onlyInstalled }: Props) {
  const { t } = useTranslation()
  const { epic, gog } = useContext(ContextProvider)
  const [recentGames, setRecentGames] = useState<GameInfo[]>([])

  const loadRecentGames = () => {
    const newRecentGames = getRecentGames([...epic.library, ...gog.library])

    setRecentGames(newRecentGames)
  }

  useEffect(() => {
    loadRecentGames()
  }, [epic.library, gog.library])

  const onGameStatusUpdates = async (_e: Event, { status }: GameStatus) => {
    if (status === 'playing') {
      loadRecentGames()
    }
  }

  useEffect(() => {
    window.api.handleSetGameStatus(onGameStatusUpdates)

    return () => {
      window.api.setGameStatusRemoveListener(onGameStatusUpdates)
    }
  })

  if (!recentGames.length) {
    return null
  }

  return (
    <>
      <h3 className="libraryHeader">{t('Recent', 'Played Recently')}</h3>
      <GamesList
        library={recentGames}
        isFirstLane
        handleGameCardClick={handleModal}
        onlyInstalled={onlyInstalled}
      />
    </>
  )
}
