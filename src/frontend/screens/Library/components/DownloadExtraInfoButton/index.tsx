import React from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'

interface DownloadExtraInfoButtonProps {
  onClick: () => void
  'data-tour'?: string
}

function DownloadExtraInfoButton({ onClick, 'data-tour': dataTour }: DownloadExtraInfoButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      className="downloadExtraInfoButton"
      onClick={onClick}
      data-tour={dataTour}
      title={t('library.downloadAllExtraInfo', 'Download All Extra Info')}
    >
      <FontAwesomeIcon icon={faDownload} />
      {t('library.downloadAllExtraInfo', 'Download All Extra Info')}
    </button>
  )
}

export default DownloadExtraInfoButton