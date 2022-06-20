import React, { useEffect, useState } from 'react'
import { AntiCheatInfo, GameInfo } from 'src/types'
import { createNewWindow, ipcRenderer } from 'src/helpers'

import './index.css'

type Props = {
  gameInfo: GameInfo
}

const awacyUrl = 'https://areweanticheatyet.com/'

export default function Anticheat({ gameInfo }: Props) {
  const [anticheatInfo, setAnticheatInfo] = useState<AntiCheatInfo | null>(null)

  useEffect(() => {
    if (gameInfo?.title) {
      ipcRenderer
        .invoke('getAnticheatInfo', gameInfo.title)
        .then((anticheatInfo: AntiCheatInfo | null) => {
          setAnticheatInfo(anticheatInfo)
        })
    }
  }, [gameInfo])

  if (!anticheatInfo) {
    return null
  }

  const mayNotWork = ['Denied', 'Broken'].includes(anticheatInfo.status)

  return (
    <div className={`anticheatInfo ${anticheatInfo.status}`}>
      <h4>This game includes anticheat software</h4>
      {mayNotWork && (
        <p>It may not work due to denied or broken anticheat support.</p>
      )}
      <span>
        <b>Anticheats:</b>{' '}
        {anticheatInfo.anticheats.length
          ? anticheatInfo.anticheats.join(', ')
          : 'Anticheat removed'}
      </span>
      <span title={anticheatInfo.notes.join(' - ')}>
        <b>Status:</b> {anticheatInfo.status}
      </span>

      <span>
        For more details, go to &nbsp;
        <a href="#" onClick={() => createNewWindow(awacyUrl)}>
          {awacyUrl}
        </a>
      </span>
    </div>
  )
}
