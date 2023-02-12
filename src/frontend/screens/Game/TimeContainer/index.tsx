import React from 'react'

import { useTranslation } from 'react-i18next'

import { SmallInfo } from 'frontend/components/UI'
import { timestampStore } from 'frontend/helpers/electronStores'

import './index.css'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import { AvTimer } from '@mui/icons-material'

type Props = {
  game: string
}

function TimeContainer({ game }: Props) {
  const { t } = useTranslation('gamepage')
  const tsInfo = timestampStore.get_nodefault(game)

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
  const firstPlayed = new Date(tsInfo.firstPlayed)
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
          subtitle={firstDate}
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
