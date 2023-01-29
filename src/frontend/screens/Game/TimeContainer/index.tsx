import React from 'react'

import { useTranslation } from 'react-i18next'

import { SmallInfo } from 'frontend/components/UI'
import { timestampStore } from 'frontend/helpers/electronStores'

import './index.css'

type Props = {
  game: string
}

function TimeContainer({ game }: Props) {
  const { t } = useTranslation('gamepage')
  const tsInfo = timestampStore.get_nodefault(game)

  if (!tsInfo) {
    return (
      <SmallInfo
        title={`${t('game.lastPlayed', 'Last Played')}:`}
        subtitle={`${t('game.neverPlayed', 'Never')}`}
      />
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
  const firstPlayed = new Date(tsInfo.firstPlayed)
  const firstDate = new Intl.DateTimeFormat(undefined, options).format(
    firstPlayed
  )
  const lastPlayed = tsInfo.lastPlayed ? new Date(tsInfo.lastPlayed) : null
  const totalPlayed = tsInfo.totalPlayed
    ? convertMinsToHrsMins(tsInfo.totalPlayed)
    : null
  const lastDate = new Intl.DateTimeFormat(undefined, options).format(
    lastPlayed || new Date()
  )

  return (
    <div className="info">
      <SmallInfo
        title={`${t('game.firstPlayed', 'First Played')}:`}
        subtitle={firstDate}
      />
      {lastPlayed && (
        <SmallInfo
          title={`${t('game.lastPlayed', 'Last Played')}:`}
          subtitle={lastDate}
        />
      )}
      {totalPlayed && (
        <SmallInfo
          title={`${t('game.totalPlayed', 'Time Played')}:`}
          subtitle={`${totalPlayed}`}
        />
      )}
    </div>
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
