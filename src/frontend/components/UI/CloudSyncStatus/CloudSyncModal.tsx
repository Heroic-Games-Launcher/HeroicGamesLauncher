import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import type { GameHandle } from 'frontend/helpers/ipc'
import type { SteamCloudSyncStatus } from 'common/types/steam'

import SteamCloudSyncPanel from './SteamCloudSyncPanel'
import './index.css'

interface Props {
  game: GameHandle
  title: string
  status: SteamCloudSyncStatus
  onClose: () => void
}

export default function CloudSyncModal({
  game,
  title,
  status,
  onClose
}: Props) {
  const { t } = useTranslation()
  const [showFiles, setShowFiles] = useState(false)

  return (
    <Dialog showCloseButton onClose={onClose} className="cloudSyncModal">
      <DialogHeader onClose={onClose}>
        {showFiles
          ? t('cloudSync.filesTitle', 'Steam Cloud files — {{game}}', {
              game: title
            })
          : t('cloudSync.title', 'Steam Cloud saves — {{game}}', {
              game: title
            })}
      </DialogHeader>
      <DialogContent>
        <SteamCloudSyncPanel
          game={game}
          status={status}
          onShowFilesChange={setShowFiles}
        />
      </DialogContent>
    </Dialog>
  )
}
