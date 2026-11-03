import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
import type { SteamCloudSyncStatus } from 'common/types/steam'

import SteamCloudSyncPanel from './SteamCloudSyncPanel'
import './index.css'

interface Props {
  appName: string
  title: string
  status: SteamCloudSyncStatus
  onClose: () => void
}

export default function CloudSyncModal({
  appName,
  title,
  status,
  onClose
}: Props) {
  const { t } = useTranslation()
  const [showFiles, setShowFiles] = useState(false)

  return (
    <Modal showCloseButton onClose={onClose} className="cloudSyncModal">
      <ModalHeader>
        {showFiles
          ? t('cloudSync.filesTitle', 'Steam Cloud files — {{game}}', {
              game: title
            })
          : t('cloudSync.title', 'Steam Cloud saves — {{game}}', {
              game: title
            })}
      </ModalHeader>
      <ModalContent>
        <SteamCloudSyncPanel
          appName={appName}
          status={status}
          onShowFilesChange={setShowFiles}
        />
      </ModalContent>
    </Modal>
  )
}
