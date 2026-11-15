import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  PathSelectionBox,
  SelectField,
  SettingRow,
  ToggleSwitch
} from 'frontend/components/UI'
import { syncSaves } from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'
import { SyncType } from 'frontend/types'
import { ProgressDialog } from 'frontend/components/UI/ProgressDialog'
import SettingsContext from '../../SettingsContext'
import TextWithProgress from 'frontend/components/UI/TextWithProgress'
import { MenuItem } from '@mui/material'
import { Button } from 'frontend/components/UI'

interface Props {
  autoSyncSaves: boolean
  isProton?: boolean
  savesPath: string
  setAutoSyncSaves: (value: boolean) => void
  setSavesPath: (value: string) => void
  winePrefix?: string
  savePathFingerprint: string
  savesPathFingerprint: string
  setSavesPathFingerprint: (value: string) => void
  syncCommands: { name: string; value: string }[]
  featureSupported: boolean
}

export default function LegendarySyncSaves({
  savesPath,
  setSavesPath,
  autoSyncSaves,
  setAutoSyncSaves,
  isProton,
  winePrefix,
  savePathFingerprint,
  savesPathFingerprint,
  setSavesPathFingerprint,
  syncCommands,
  featureSupported
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const [syncType, setSyncType] = useState('--skip-upload')
  const [manuallyOutput, setManuallyOutput] = useState<string[]>([])
  const [manuallyOutputShow, setManuallyOutputShow] = useState<boolean>(false)
  const [retry, setRetry] = useState<boolean>(false)
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const { appName } = useContext(SettingsContext)

  useEffect(() => {
    const setDefaultSaveFolder = async () => {
      const legacy = !savesPathFingerprint
      const stale = !legacy && savesPathFingerprint !== savePathFingerprint
      if (legacy && savesPath.length) {
        setSavesPathFingerprint(savePathFingerprint)
        return
      }
      if (!legacy && !stale && savesPath.length && !retry) {
        return
      }
      setLoading(true)
      try {
        const newSavePath = (await window.api.getDefaultSavePath(
          appName,
          'legendary',
          []
        )) as string

        if (newSavePath) {
          setSavesPath(newSavePath)
        }
        setRetry(false)
      } catch (error) {
        window.api.logError(
          `Could not detect save path for ${appName}: ${error}`
        )
      } finally {
        setLoading(false)
      }
    }
    if (featureSupported) setDefaultSaveFolder()
  }, [winePrefix, isProton, retry, savePathFingerprint, savesPathFingerprint])

  async function handleSync() {
    setIsSyncing(true)

    try {
      const result = await syncSaves(savesPath, appName, 'legendary', syncType)
      setManuallyOutput(result.output.split('\n'))
      setManuallyOutputShow(true)
    } catch (error) {
      window.api.logError(`Sync saves failed for ${appName}: ${error}`)
    } finally {
      setIsSyncing(false)
    }
  }

  if (!featureSupported) {
    return (
      <Alert variant="info">
        {t(
          'settings.saves.not_supported',
          'This game does not support cloud saves.'
        )}
      </Alert>
    )
  }

  return (
    <>
      {manuallyOutputShow && (
        <ProgressDialog
          title={'Sync-Saves'}
          progress={manuallyOutput}
          showCloseButton={true}
          onClose={() => {
            setManuallyOutputShow(false)
          }}
          hideProgress
        />
      )}
      {isLoading ? (
        <TextWithProgress
          text={t(
            'info.save-sync.searching',
            'Trying to detect the correct save folder (click to cancel)'
          )}
          onClick={() => {
            window.api.abort(`${appName}-savePath`)
            setLoading(false)
          }}
        />
      ) : (
        <>
          <Alert
            variant={savesPath ? 'info' : 'warning'}
            actions={
              <Button variant="ghost" size="sm" onClick={() => setRetry(true)}>
                {t('setting.savefolder.retry', 'Detect again')}
              </Button>
            }
          >
            {savesPath
              ? t(
                  'setting.savefolder.warning',
                  'Please check twice if the path is correct (click to retry)'
                )
              : t(
                  'setting.savefolder.not-found',
                  'Save folder not found, please select it manually (click to retry)'
                )}
          </Alert>

          <PathSelectionBox
            htmlId="inputSavePath"
            type="directory"
            onPathChange={setSavesPath}
            path={savesPath}
            placeholder={t('setting.savefolder.placeholder')}
            pathDialogTitle={t('box.sync.title')}
            canEditPath={!isSyncing}
            label={t('setting.savefolder.title', 'Save folder')}
            info={
              <ul>
                <li>{t('help.sync.part1')}</li>
                {!isWin && <li>{t('help.sync.part2')}</li>}
                <li>{t('help.sync.part3')}</li>
                <li>{t('help.sync.part4')}</li>
              </ul>
            }
          />

          <SettingRow
            label={t('setting.manualsync.title')}
            htmlFor="selectSyncType"
          >
            <SelectField
              htmlId="selectSyncType"
              onChange={(event) => setSyncType(event.target.value as SyncType)}
              value={syncType}
              disabled={!savesPath.length}
            >
              {syncCommands.map((el, i) => (
                <MenuItem value={el.value} key={i}>
                  {el.name}
                </MenuItem>
              ))}
            </SelectField>
            <Button
              variant="primary"
              data-testid="setSync"
              onClick={async () => handleSync()}
              disabled={isSyncing || !savesPath.length}
            >
              {isSyncing
                ? t('setting.manualsync.syncing')
                : t('setting.manualsync.sync')}
            </Button>
          </SettingRow>

          <ToggleSwitch
            htmlId="autosync"
            value={autoSyncSaves}
            disabled={!savesPath.length}
            handleChange={() => setAutoSyncSaves(!autoSyncSaves)}
            title={t('setting.autosync')}
          />
        </>
      )}
    </>
  )
}
