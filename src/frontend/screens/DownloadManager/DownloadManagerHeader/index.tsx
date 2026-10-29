import { useTranslation } from 'react-i18next'

type Props = {
  time: 'started' | 'finished' | 'queued'
}

export default function DownloadManagerHeader({ time }: Props) {
  const { t } = useTranslation()

  const getTimeLabel = () => {
    switch (time) {
      case 'started':
        return t('download-manager.queue.start-time', 'Started at')
      case 'finished':
        return t('download-manager.queue.end-time', 'Finished at')
      case 'queued':
        return t('download-manager.queue.queue-time', 'Added at')
    }
  }

  return (
    <div className="DownloadList__head">
      <span>{t('game.title', 'Game Title')}</span>
      <span>{t('download-manager.queue.type', 'Type')}</span>
      <span className="DownloadList__headStore">
        {t('game.store', 'Store')}
      </span>
      <span>{getTimeLabel()}</span>
      <span className="DownloadList__headActions">
        {t('wine.actions', 'Action')}
      </span>
    </div>
  )
}
