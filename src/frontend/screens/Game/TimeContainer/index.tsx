import { useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { SmallInfo } from 'frontend/components/UI'
import { timestampStore } from 'frontend/helpers/electronStores'

import './index.css'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import { AvTimer } from '@mui/icons-material'
import { GameInfo } from 'common/types'
import { hasStatus } from 'frontend/hooks/hasStatus'

type Props = {
  gameInfo: GameInfo
}

function TimeContainer({ gameInfo }: Props) {
  const { app_name: game, runner } = gameInfo
  const { t } = useTranslation('gamepage')
  const [tsInfo, setTsInfo] = useState(timestampStore.get_nodefault(game))
  const { status } = hasStatus(gameInfo)

  useEffect(() => {
    // update local stored time after playing
    setTsInfo(timestampStore.get_nodefault(game))
    async function fetchPlaytime() {
      const playTime = await window.api.fetchPlaytimeFromServer(runner, game)
      if (!playTime) {
        return
      }
      if (tsInfo?.totalPlayed) {
        if (tsInfo.totalPlayed < playTime) {
          const newObject = { ...tsInfo, totalPlayed: playTime }
          timestampStore.set(game, newObject)
          setTsInfo(newObject)
        }
      } else {
        const newObject = {
          firstPlayed: '',
          lastPlayed: '',
          totalPlayed: playTime
        }
        timestampStore.set(game, newObject)
        setTsInfo(newObject)
      }
    }

    fetchPlaytime()
  }, [status])

  if (!tsInfo) {
    return (
      <p className="timeContainerLabel">
        <AvTimer />
        {`${t('game.lastPlayed', 'Last Played')}:`} {` `}
        {`${t('game.neverPlayed', 'Never')}`}
      </p>
    )
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }
  const firstPlayed = tsInfo.firstPlayed
    ? new Date(tsInfo.firstPlayed)
    : undefined
  const firstDate = new Intl.DateTimeFormat(undefined, options).format(
    firstPlayed
  )
  const lastPlayed = tsInfo.lastPlayed ? new Date(tsInfo.lastPlayed) : null
  const totalPlayed = tsInfo.totalPlayed
    ? convertMinsToHrsMins(tsInfo.totalPlayed)
    : `${t('game.neverPlayed', 'Never')}`
  const lastDate = new Intl.DateTimeFormat(undefined, options).format(
    lastPlayed || new Date()
  )

  return (
    <PopoverComponent
      item={
        <p className="timeContainerLabel">
          <AvTimer />
          {`${t('game.totalPlayed', 'Time Played')}:`} {` `}
          {`${totalPlayed}`}
        </p>
      }
    >
      <div className="info">
        <SmallInfo
          title={`${t('game.firstPlayed', 'First Played')}:`}
          subtitle={firstPlayed ? firstDate : t('game.neverPlayed', 'Never')}
        />
        {lastPlayed && (
          <SmallInfo
            title={`${t('game.lastPlayed', 'Last Played')}:`}
            subtitle={lastDate}
          />
        )}
      </div>
    </PopoverComponent>
  )
}

const convertMinsToHrsMins = (mins: number) => {
  let h: string | number = Math.floor(mins / 60)
  let m: string | number = mins % 60
  h = h < 10 ? '0' + h : h
  m = m < 10 ? '0' + m : m
  return `${h}:${m}`
}

export default TimeContainer
