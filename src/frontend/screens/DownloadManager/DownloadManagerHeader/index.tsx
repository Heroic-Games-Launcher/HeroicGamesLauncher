import React from 'react'
import { useTranslation } from 'react-i18next'

export default function GameListHeader() {
  const { t } = useTranslation()
  return (
    <div className="gameListHeader">
      <span>{t('download.manager.queue.element', 'Name')}</span>
      <span>{t('download.manager.queue.store', 'Store')}</span>
      <span>{t('download.manager.queue.platform', 'Platform')}</span>
      <span>{t('download.manager.queue.actions', 'Action')}</span>
    </div>
  )
}
