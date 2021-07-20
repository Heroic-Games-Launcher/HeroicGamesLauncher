import * as React from 'react'

import { useTranslation } from 'react-i18next'
import ElectronStore from 'electron-store'

import { SmallInfo } from 'src/components/UI'
const storage = window.localStorage
const Store = window.require('electron-store')
const store: ElectronStore = new Store({
  'cwd': 'store',
  'name': 'timestamp'
})

type Props = {
  game: string
}

type TimeStamp = {
  firstPlayed: Date
  lastPlayed: Date
}

function TimeContainer({game}: Props) {
  const {t} = useTranslation('gamepage')
  const hasPlayed = store.has(game)

  if (!hasPlayed){
    return <SmallInfo
      title={`${t('game.lastPlayed', 'Last Played')}:`}
      subtitle={`${t('game.neverPlayed', 'Never')}`} />
  }

  const tsInfo = store.get(game) as TimeStamp
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short'
  };
  const firstPlayed = new Date(tsInfo.firstPlayed)
  const firstDate = new Intl.DateTimeFormat(storage.getItem('language') || 'en', options).format(firstPlayed);
  const lastPlayed = new Date(tsInfo.lastPlayed || '')
  const lastDate = new Intl.DateTimeFormat(storage.getItem('language') || 'en', options).format(lastPlayed);
  const totalPlayed = ((Number(lastPlayed) - Number(firstPlayed)) / 1000 / 60 / 60).toFixed(1)

  return <div className="info">
    <SmallInfo title={`${t('game.firstPlayed', 'First Played')}:`} subtitle={firstDate}/>
    <SmallInfo title={`${t('game.lastPlayed', 'Last Played')}:`} subtitle={lastDate}/>
    <SmallInfo title={`${t('game.totalPlayed', `Time Played`)}:`} subtitle={`${totalPlayed}h`}/>
  </div>
}

export default TimeContainer
