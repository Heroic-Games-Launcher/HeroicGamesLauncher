import React, { MouseEvent, useEffect, useState } from 'react'
import { AntiCheatInfo, GameInfo } from 'common/types'
import { createNewWindow, ipcRenderer } from 'frontend/helpers'

import './index.css'
import { useTranslation } from 'react-i18next'

type Props = {
  gameInfo: GameInfo
}

const awacyUrl = 'https://areweanticheatyet.com/'

export default function Anticheat({ gameInfo }: Props) {
  const { t } = useTranslation()

  const [anticheatInfo, setAnticheatInfo] = useState<AntiCheatInfo | null>(null)

  useEffect(() => {
    if (gameInfo?.title) {
      ipcRenderer
        .invoke('getAnticheatInfo', gameInfo.namespace)
        .then((anticheatInfo: AntiCheatInfo | null) => {
          setAnticheatInfo(anticheatInfo)
        })
    }
  }, [gameInfo])

  if (!anticheatInfo) {
    return null
  }

  const mayNotWork = ['Denied', 'Broken'].includes(anticheatInfo.status)

  const latestUpdate =
    anticheatInfo.reference ||
    anticheatInfo.updates[anticheatInfo.updates.length - 1]?.reference

  const onLastReferenceClick = (event: MouseEvent) => {
    event.preventDefault()
    createNewWindow(latestUpdate)
  }

  const onAWACYClick = (event: MouseEvent) => {
    event.preventDefault()
    createNewWindow(awacyUrl)
  }

  return (
    <div className={`anticheatInfo ${anticheatInfo.status}`}>
      <h4>{t('anticheat.title', 'This game includes anticheat software')}</h4>
      {mayNotWork && (
        <p>
          {t(
            'anticheat.may_not_work',
            'It may not work due to denied or broken anticheat support.'
          )}
        </p>
      )}
      <span>
        <b>{t('anticheat.anticheats', 'Anticheats')}:</b>&nbsp;
        {anticheatInfo.anticheats.length
          ? anticheatInfo.anticheats.join(', ')
          : 'Anticheat removed'}
      </span>
      <span>
        <b>{t('anticheat.status', 'Status')}:</b> {anticheatInfo.status}&nbsp;
        {latestUpdate && (
          <a href="#" onClick={onLastReferenceClick}>
            ({t('anticheat.reference', 'Reference')})
          </a>
        )}
      </span>

      <span>
        <b>{t('anticheat.source', 'Source')}:</b>&nbsp;
        <a href="#" onClick={onAWACYClick}>
          AreWeAntiCheatYet
        </a>
      </span>
    </div>
  )
}
