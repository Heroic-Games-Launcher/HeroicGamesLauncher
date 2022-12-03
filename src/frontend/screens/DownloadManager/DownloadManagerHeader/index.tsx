import React from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  time: 'started' | 'finished' | 'queued' | 'paused'
}

export default function GameListHeader({ time }: Props) {
  const { t } = useTranslation()

  const getTimeLabel = () => {
    switch (time) {
      case 'started':
        return t('download-manager.queue.start-time', 'Started at')
      case 'finished':
        return t('download-manager.queue.end-time', 'Finished at')
      case 'queued':
        return t('download-manager.queue.queue-time', 'Added at')
      case 'paused':
        return t('download-manager.queue.pause-time', 'Paused At')
    }
  }

  return (
    <div className="gameListHeader">
      <span>{t('game.title', 'Game Title')}</span>
      <span>{getTimeLabel()}</span>
      <span>{t('download-manager.queue.type', 'Type')}</span>
      <span>{t('game.store', 'Store')}</span>
      <span>{t('wine.actions', 'Action')}</span>
    </div>
  )
}
