import React, { MouseEvent } from 'react'
import { AntiCheatInfo } from 'common/types'
import { createNewWindow } from 'frontend/helpers'

import { ReactComponent as InfoIcon } from 'frontend/assets/info_icon.svg'
import { ReactComponent as DeniedIcon } from 'frontend/assets/denied_icon.svg'
import { ReactComponent as AllowedIcon } from 'frontend/assets/rounded_checkmark_icon.svg'

import './index.scss'
import { useTranslation } from 'react-i18next'

type Props = {
  anticheatInfo: AntiCheatInfo | null
}

const awacyUrl = 'https://areweanticheatyet.com/'

export default function Anticheat({ anticheatInfo }: Props) {
  const { t } = useTranslation()

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

  const getIcon = () => {
    switch (anticheatInfo.status) {
      case 'Denied':
        return <DeniedIcon />
      case 'Broken':
        return <DeniedIcon />
      case 'Running':
        return <AllowedIcon />
      case 'Supported':
        return <AllowedIcon />
      default:
        return <InfoIcon />
    }
  }

  return (
    <div className={`anticheatInfo ${anticheatInfo.status}`}>
      <div className="statusIcon">{getIcon()}</div>
      <div className="statusInfo">
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
    </div>
  )
}
