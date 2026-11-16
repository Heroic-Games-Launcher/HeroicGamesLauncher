import { MouseEvent, useContext } from 'react'
import { AntiCheatInfo } from 'common/types'
import { createNewWindow } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.scss'
import Alert from '../Alert'
import DetailList from '../DetailList'

type Props = {
  anticheatInfo: AntiCheatInfo | null
}

const awacyUrl = 'https://areweanticheatyet.com/'

const VARIANTS = {
  Supported: 'success',
  Running: 'success',
  Working: 'success',
  Broken: 'error',
  Denied: 'error'
} as const

export default function Anticheat({ anticheatInfo }: Props) {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)

  if (!anticheatInfo) {
    return null
  }

  const variant = VARIANTS[anticheatInfo.status] ?? 'warning'
  const mayNotWork = ['Denied', 'Broken', 'Unknown'].includes(
    anticheatInfo.status
  )

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

  const items = [
    {
      label: t('anticheat.anticheats', 'Anticheats'),
      value: anticheatInfo.anticheats.length
        ? anticheatInfo.anticheats.join(', ')
        : t('anticheat.removed', 'Anticheat removed')
    },
    {
      label: t('anticheat.status', 'Status'),
      value: (
        <>
          {anticheatInfo.status}
          {latestUpdate && (
            <>
              {' '}
              <a className="link" href="#" onClick={onLastReferenceClick}>
                ({t('anticheat.reference', 'Reference')})
              </a>
            </>
          )}
        </>
      )
    }
  ]

  if (platform === 'linux') {
    items.push({
      label: t('anticheat.source', 'Source'),
      value: (
        <a className="link" href="#" onClick={onAWACYClick}>
          AreWeAntiCheatYet
        </a>
      )
    })
  }

  return (
    <Alert
      className="anticheatInfo"
      title={t('anticheat.title', 'This game includes anticheat software')}
      variant={variant}
    >
      {mayNotWork && (
        <p className="anticheatInfo__note">
          {t(
            'anticheat.multiplayer_may_not_work',
            'Multiplayer features may not work due to denied or broken anticheat support.'
          )}
        </p>
      )}
      <DetailList items={items} />
    </Alert>
  )
}
