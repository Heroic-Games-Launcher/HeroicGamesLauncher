import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircularProgress } from '@mui/material'

import { Dialog, DialogContent, DialogFooter, DialogHeader } from '../Dialog'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

export default function LogUploadDialog() {
  const { t } = useTranslation()
  const { uploadLogFileProps, setUploadLogFileProps } = useShallowGlobalState(
    'uploadLogFileProps',
    'setUploadLogFileProps'
  )

  const [confirmed, setConfirmed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(false)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)

  const onClose = useCallback(() => {
    setConfirmed(false)
    setUploading(false)
    setUploadLogFileProps(false)
  }, [setConfirmed, setUploading, setUploadLogFileProps])

  const doUpload = useCallback(async () => {
    if (!uploadLogFileProps) return

    setConfirmed(true)
    setUploading(true)

    const result = await window.api.uploadLogFile(
      uploadLogFileProps.name,
      uploadLogFileProps.appNameOrRunner
    )

    setUploading(false)
    if (!result) {
      setError(true)
      return
    }
    const [url] = result
    await navigator.clipboard.writeText(url)
    setUploadUrl(url)
  }, [uploadLogFileProps])

  const [dialogTitle, dialogContent, dialogFooter] = useMemo(() => {
    if (!uploadLogFileProps) return ['', '', '']
    if (!confirmed)
      return [
        t('setting.log.upload.confirm.title', 'Upload log file?'),
        t(
          'setting.log.upload.confirm.content',
          'Do you really want to upload "{{name}}"?',
          { name: uploadLogFileProps.name }
        ),
        <>
          <button onClick={doUpload} className={'button is-primary'}>
            {t('box.yes')}
          </button>
          <button onClick={onClose} className={'button is-danger'}>
            {t('box.no')}
          </button>
        </>
      ]
    if (uploading)
      return [
        t('setting.log.upload.uploading.title', 'Uploading'),
        <>
          <CircularProgress />
          <br />
          {t('setting.log.upload.uploading.content', 'Uploading log file...')}
        </>,
        <></>
      ]
    if (error)
      return [
        t('setting.log.upload.error.title', 'Upload failed'),
        t(
          'setting.log.upload.error.content',
          "Failed to upload log file. Check Heroic's general log for details"
        ),
        <>
          <button onClick={onClose} className={'button is-secondary'}>
            {t('box.ok')}
          </button>
        </>
      ]
    return [
      t('setting.log.upload.done.title', 'Upload complete'),
      t(
        'setting.log.upload.done.content',
        'Uploaded to {{url}} (URL copied to your clipboard)',
        {
          url: uploadUrl
        }
      ),
      <>
        <button onClick={onClose} className={'button is-secondary'}>
          {t('box.ok')}
        </button>
      </>
    ]
  }, [uploadLogFileProps, confirmed, uploading, error, uploadUrl])

  if (!uploadLogFileProps) return <></>

  return (
    <Dialog onClose={onClose} showCloseButton={false}>
      <DialogHeader>{dialogTitle}</DialogHeader>
      <DialogContent>{dialogContent}</DialogContent>
      <DialogFooter>{dialogFooter}</DialogFooter>
    </Dialog>
  )
}
