import { useContext, useEffect, useState } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { SyncType } from 'common/types'
import { GOGCloudSavesLocation } from 'common/types/gog'
import {
  Alert,
  PathSelectionBox,
  SelectField,
  SettingRow,
  ToggleSwitch
} from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import { ProgressDialog } from 'frontend/components/UI/ProgressDialog'
import SettingsContext from '../../SettingsContext'
import TextWithProgress from 'frontend/components/UI/TextWithProgress'
import { MenuItem } from '@mui/material'
import { Button } from 'frontend/components/UI'

interface Props {
  gogSaves: GOGCloudSavesLocation[]
  setGogSaves: (saves: GOGCloudSavesLocation[]) => void
  savePathFingerprint: string
  savesPathFingerprint: string
  setSavesPathFingerprint: (value: string) => void
  autoSyncSaves: boolean
  setAutoSyncSaves: (value: boolean) => void
  syncCommands: { name: string; value: string }[]
  featureSupported: boolean
  isLinuxNative: boolean
}

export default function GOGSyncSaves({
  gogSaves,
  setGogSaves,
  savePathFingerprint,
  savesPathFingerprint,
  setSavesPathFingerprint,
  autoSyncSaves,
  setAutoSyncSaves,
  syncCommands,
  featureSupported,
  isLinuxNative
}: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncType, setSyncType] = useState('--skip-upload')
  const [manuallyOutput, setManuallyOutput] = useState<string[]>([])
  const [manuallyOutputShow, setManuallyOutputShow] = useState<boolean>(false)
  const [retry, setRetry] = useState<boolean>(false)

  const { t } = useTranslation()

  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  const { appName } = useContext(SettingsContext)

  useEffect(() => {
    const getLocations = async () => {
      setIsLoading(true)
      const legacy = !savesPathFingerprint
      const stale = !legacy && savesPathFingerprint !== savePathFingerprint
      try {
        if (legacy && gogSaves.length) {
          setSavesPathFingerprint(savePathFingerprint)
          return
        }

        const locations = (await window.api.getDefaultSavePath(
          appName,
          'gog',
          stale ? [] : gogSaves
        )) as GOGCloudSavesLocation[]

        if (locations.length > 0) {
          setGogSaves(locations)
        } else if (gogSaves.length === 0) {
          setGogSaves([{ name: '__default', location: '' }])
        }
      } catch (error) {
        window.api.logError(
          `Could not detect save path for ${appName}: ${error}`
        )
      } finally {
        setIsSyncing(false)
        setIsLoading(false)
      }
    }
    if (featureSupported && !isLinuxNative) getLocations()
  }, [retry, savePathFingerprint, savesPathFingerprint])

  const handleRetry = () => {
    setGogSaves([])
    setRetry(!retry)
  }

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      const result = await window.api.syncGOGSaves(gogSaves, appName, syncType)
      setManuallyOutput(result.output.split('\n'))
      setManuallyOutputShow(true)
    } catch (error) {
      window.api.logError(`Sync saves failed for ${appName}: ${error}`)
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLinuxNative || !featureSupported) {
    return (
      <div style={{ color: 'red' }}>
        {isLinuxNative &&
          t(
            'settings.saves.gog_linux_native_warning',
            "linux native games do not support GOG's cloud saves feature. Use the windows version instead."
          )}
        <br />
        {!featureSupported &&
          t(
            'settings.saves.not_supported',
            'Cloud Saves are not supported by this game.'
          )}
      </div>
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
            setIsLoading(false)
          }}
        />
      ) : (
        <>
          {gogSaves.map((value, index) => (
            <div key={`saves-${value.name}`} style={{ width: '100%' }}>
              <PathSelectionBox
                type="directory"
                htmlId="inputSavePath"
                placeholder={t('setting.savefolder.placeholder')}
                path={value.location}
                canEditPath={!isSyncing}
                onPathChange={(path) => {
                  const saves = [...gogSaves]
                  saves[index] = {
                    name: value.name,
                    location: path
                  }
                  setGogSaves(saves)
                }}
                pathDialogTitle={t('box.sync.title')}
                label={value.name}
                info={
                  <ul>
                    <li>{t('help.sync.part1')}</li>
                    {!isWin && <li>{t('help.sync.part2')}</li>}
                    <li>{t('help.sync.part3')}</li>
                    <li>{t('help.sync.part4')}</li>
                  </ul>
                }
              />
              <Alert
                variant={value.location.length ? 'info' : 'warning'}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRetry()}
                  >
                    {t('setting.savefolder.retry', 'Detect again')}
                  </Button>
                }
              >
                {gogSaves.length >= 1 && value.location.length
                  ? t(
                      'setting.savefolder.warning',
                      'Please check twice if the path is correct (click to retry)'
                    )
                  : t(
                      'setting.savefolder.not-found',
                      'Save folder not found, please select it manually (click to retry)'
                    )}
              </Alert>
            </div>
          ))}

          <SettingRow
            label={t('setting.manualsync.title')}
            htmlFor="selectSyncType"
          >
            <SelectField
              htmlId="selectSyncType"
              onChange={(event) => setSyncType(event.target.value as SyncType)}
              value={syncType}
              disabled={!gogSaves.every((value) => value.location.length)}
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
              disabled={
                isSyncing || !gogSaves.every((value) => value.location.length)
              }
            >
              {isSyncing
                ? t('setting.manualsync.syncing')
                : t('setting.manualsync.sync')}
            </Button>
          </SettingRow>
          <ToggleSwitch
            htmlId="autosync"
            value={autoSyncSaves}
            disabled={!gogSaves.every((value) => value.name.length)}
            handleChange={() => setAutoSyncSaves(!autoSyncSaves)}
            title={t('setting.autosync')}
          />
        </>
      )}
    </>
  )
}
