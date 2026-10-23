import { Checkbox, FormControlLabel } from '@mui/material'
import { GOGBonusContent } from 'common/types/gog'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { size } from 'frontend/helpers'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  appName: string
  onClose: () => void
}

export default function GOGExtrasDialog({ appName, onClose }: Props) {
  const { t } = useTranslation('gamepage')
  const [extras, setExtras] = useState<GOGBonusContent[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [status, setStatus] = useState('')
  const allFileIds = extras.flatMap((extra) =>
    extra.files.map((file) => file.id)
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadFailed(false)
    setExtras([])
    setSelectedFiles([])
    setStatus('')
    window.api
      .getGOGExtras(appName)
      .then((result) => {
        if (active) {
          setExtras(result ?? [])
          setLoadFailed(result === null)
        }
      })
      .catch(() => {
        if (active) setLoadFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [appName])

  const downloadSelected = async () => {
    if (!selectedFiles.length || downloading) return
    setDownloading(true)
    setStatus('')
    try {
      const destination = await window.api.openDialog({
        properties: ['openDirectory'],
        title: t('extras.chooseDestination', 'Choose a folder for the extras')
      })
      if (!destination) return
      const result = await window.api.downloadGOGExtras(
        appName,
        selectedFiles,
        destination
      )
      setSelectedFiles(result.failed.filter((id) => allFileIds.includes(id)))
      setStatus(
        t('extras.downloadResult', {
          defaultValue: 'Downloaded {{downloaded}} file(s); {{failed}} failed.',
          downloaded: result.downloaded.length,
          failed: result.failed.length
        })
      )
    } catch {
      setStatus(
        t('extras.downloadFailed', 'Could not download the selected extras.')
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog showCloseButton disableClose={downloading} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <div>{t('extras.title', 'GOG Extras')}</div>
      </DialogHeader>
      <DialogContent>
        {loading ? (
          <p>{t('extras.loading', 'Loading extras…')}</p>
        ) : loadFailed ? (
          <p role="alert">
            {t('extras.loadFailed', 'Could not load extras. Please try again.')}
          </p>
        ) : allFileIds.length ? (
          <>
            {extras.map((extra) =>
              extra.files.length ? (
                <section key={extra.id}>
                  <h3>{extra.name}</h3>
                  {extra.files.map((file) => (
                    <FormControlLabel
                      key={file.id}
                      control={
                        <Checkbox
                          disabled={downloading}
                          checked={selectedFiles.includes(file.id)}
                          onChange={(event) => {
                            setSelectedFiles((current) =>
                              event.target.checked
                                ? [...current, file.id]
                                : current.filter((id) => id !== file.id)
                            )
                          }}
                        />
                      }
                      label={`${file.filename} (${size(file.size)})`}
                    />
                  ))}
                </section>
              ) : null
            )}
            <button
              className="button is-primary"
              onClick={downloadSelected}
              disabled={!selectedFiles.length || downloading}
            >
              {downloading
                ? t('extras.downloading', 'Downloading…')
                : t('extras.downloadSelected', 'Download selected extras')}
            </button>
          </>
        ) : (
          <p>{t('extras.none', 'No extras are available for this game.')}</p>
        )}
        {downloading && (
          <p role="status">
            {t(
              'extras.keepOpen',
              'Please keep this dialog open until the downloads finish.'
            )}
          </p>
        )}
        {status && <p role="status">{status}</p>}
      </DialogContent>
    </Dialog>
  )
}
