import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getRecentGames } from 'src/helpers/library'
import ContextProvider from 'src/state/ContextProvider'
import { GameInfo, GameStatus, Runner } from 'src/types'
import { GamesList } from '../GamesList'
import { ipcRenderer } from 'src/helpers'

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
    ipcRenderer.on('setGameStatus', onGameStatusUpdates)

    return () => {
      ipcRenderer.removeListener('setGameStatus', onGameStatusUpdates)
    }
  })

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
