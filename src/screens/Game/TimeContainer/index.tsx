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
  totalPlayed: number
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
  const lastPlayed = tsInfo.lastPlayed ? new Date(tsInfo.lastPlayed) : null
  const totalPlayed = tsInfo.totalPlayed ? tsInfo.totalPlayed.toFixed(1) : null
  const lastDate = new Intl.DateTimeFormat(storage.getItem('language') || 'en', options).format(lastPlayed || new Date());

  return <div className="info">
    <SmallInfo title={`${t('game.firstPlayed', 'First Played')}:`} subtitle={firstDate}/>
    {lastPlayed && <SmallInfo title={`${t('game.lastPlayed', 'Last Played')}:`} subtitle={lastDate}/>}
    {totalPlayed && <SmallInfo title={`${t('game.totalPlayed', 'Time Played')}:`} subtitle={`${totalPlayed}h`}/>}
  </div>
}

export default TimeContainer
