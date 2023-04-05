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
      <div className="timeContainerLabel">
        <AvTimer />
        {`${t('game.lastPlayed', 'Last Played')}:`} {` `}
        {`${t('game.neverPlayed', 'Never')}`}
      </div>
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
        <div
          className="timeContainerLabel"
          title={t('info.clickToOpen', 'Click to open')}
        >
          <AvTimer />
          {`${t('game.totalPlayed', 'Time Played')}:`} {` `}
          {`${totalPlayed}`}
        </div>
      }
    >
      <div className="info">
        <div style={{ marginBottom: '5px' }}>
          <SmallInfo
            title={`${t('game.firstPlayed', 'First Played')}:`}
            subtitle={firstDate}
          />
        </div>
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
