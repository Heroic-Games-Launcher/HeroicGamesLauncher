import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Launch, Delete } from '@mui/icons-material'

import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import SvgButton from 'frontend/components/UI/SvgButton'

import useUploadedLogFiles from 'frontend/state/UploadedLogFiles'
import type { UploadedLogData } from 'common/types'
import useGlobalState from 'frontend/state/GlobalStateV2'

import './index.css'

interface UploadedLogFileItemProps extends UploadedLogData {
  url: string
}
const UploadedLogFileItem = memo(function UploadedLogFileItem(
  props: UploadedLogFileItemProps
) {
  const { url, name, uploadedAt } = props
  const { t } = useTranslation()

  // eslint-disable-next-line react-hooks/purity -- Date.now() is intentionally used to show relative upload time
  const minutesAgo = Math.round((Date.now() - uploadedAt) / 1000 / 60)
  const showHours = minutesAgo > 60
  const uploadedAgoText = showHours
    ? t(
        'setting.log.upload.hours-ago',
        'Uploaded {{hoursAgo, relativetime(hours)}}',
        { hoursAgo: -Math.round(minutesAgo / 60) }
      )
    : t(
        'setting.log.upload.minutes-ago',
        'Uploaded {{minutesAgo, relativetime(minutes)}}',
        {
          minutesAgo: -minutesAgo
        }
      )

  return (
    <tr>
      <td>{name}</td>
      <td>{uploadedAgoText}</td>
      <td>
        <SvgButton
          onClick={() => window.api.openExternalUrl(url)}
          title={t('setting.log.upload.open', 'Open log file upload')}
        >
          <Launch color="primary" />
        </SvgButton>
        <SvgButton
          onClick={async () => window.api.deleteUploadedLogFile(url)}
          title={t('setting.log.upload.delete', 'Request log file deletion')}
        >
          <Delete color="error" />
        </SvgButton>
      </td>
    </tr>
  )
})

export default function UploadedLogFilesList() {
  const { showUploadedLogFileList } = useGlobalState.keys(
    'showUploadedLogFileList'
  )
  const uploadedLogFiles = useUploadedLogFiles()
  const { t } = useTranslation()

  const logsSortedByMostRecentlyUploaded = useMemo(() => {
    const logsArr = Object.entries(uploadedLogFiles).map(([url, data]) => ({
      ...data,
      url
    }))
    logsArr.sort((a, b) => b.uploadedAt - a.uploadedAt)
    return logsArr
  }, [uploadedLogFiles])

  if (!showUploadedLogFileList) return <></>

  return (
    <Dialog
      onClose={() =>
        useGlobalState.setState({ showUploadedLogFileList: false })
      }
      showCloseButton={true}
    >
      <DialogHeader>
        {t('setting.log.upload.header', 'Uploaded log files')}
      </DialogHeader>
      <DialogContent>
        {logsSortedByMostRecentlyUploaded.length ? (
          <table className="uploadedLogFilesTable">
            <thead>
              <tr>
                <th>{t('setting.log.upload.title', 'Log title')}</th>
                <th>{t('setting.log.upload.upload-date', 'Upload date')}</th>
                <th>{t('setting.log.upload.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {logsSortedByMostRecentlyUploaded.map(
                (logData: UploadedLogFileItemProps) => (
                  <UploadedLogFileItem key={logData.url} {...logData} />
                )
              )}
            </tbody>
          </table>
        ) : (
          t('setting.log.upload.no-files', 'No log files were uploaded')
        )}
      </DialogContent>
    </Dialog>
  )
}
