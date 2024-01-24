import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  InfoBox,
  PathSelectionBox,
  SelectField,
  ToggleSwitch
} from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { SyncType } from 'frontend/types'
import { ProgressDialog } from 'frontend/components/UI/ProgressDialog'
import SettingsContext from '../../SettingsContext'
import TextWithProgress from 'frontend/components/UI/TextWithProgress'
import type { KeyValuePair } from 'backend/schemas'

interface Props {
  autoSyncSaves: boolean
  isProton?: boolean
  savePaths: KeyValuePair[] | null
  setAutoSyncSaves: (value: boolean) => void
  setSavePaths: (value: KeyValuePair[]) => void
  winePrefix?: string
  syncCommands: { name: string; value: string }[]
}

export default function LegendarySyncSaves({
  savePaths,
  setSavePaths,
  autoSyncSaves,
  setAutoSyncSaves,
  isProton,
  winePrefix,
  syncCommands
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
  const { appName, runner } = useContext(SettingsContext)

  useEffect(() => {
    const setDefaultSaveFolder = async () => {
      if (savePaths && !retry) {
        return
      }
      setLoading(true)
      const newSavePaths = await window.api.getDefaultSavePath(appName, runner)

      setSavePaths(newSavePaths)
      setLoading(false)
      setRetry(false)
    }
    setDefaultSaveFolder()
  }, [winePrefix, isProton, retry])

  function handleSync() {
    setIsSyncing(true)

    window.api
      .syncSaves({
        paths: savePaths,
        appName,
        runner,
        arg: syncType
      })
      .then((response) => {
        setManuallyOutput(response.split('\n'))
        setManuallyOutputShow(true)
        setIsSyncing(false)
      })
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
        />
      )}
      <div className="infoBox saves-warning">
        <FontAwesomeIcon icon={faExclamationTriangle} color={'yellow'} />
        {t(
          'settings.saves.warning',
          'Cloud Saves feature is in Beta, please backup your saves before syncing (in case something goes wrong)'
        )}
      </div>
      {isLoading ? (
        <TextWithProgress
          text={t(
            'info.save-sync.searching',
            'Trying to detect the correct save folder (click to cancel)'
          )}
          onClick={() => setLoading(false)}
        />
      ) : (
        <>
          {savePaths &&
            savePaths.map((path, index) => (
              <div key={`saves-${path.key}`} style={{ width: '100%' }}>
                <PathSelectionBox
                  type="directory"
                  htmlId="inputSavePath"
                  placeholder={t('setting.savefolder.placeholder')}
                  path={path.value}
                  canEditPath={isSyncing}
                  onPathChange={(newPath) => {
                    const saves = [...savePaths]
                    saves[index].value = newPath
                    setSavePaths(saves)
                  }}
                  pathDialogTitle={t('box.sync.title')}
                  afterInput={
                    <span
                      role={'button'}
                      className="smallMessage"
                      onClick={() => setRetry(true)}
                    >
                      {path.value.length
                        ? t(
                            'setting.savefolder.warning',
                            'Please check twice if the path is correct (click to retry)'
                          )
                        : t(
                            'setting.savefolder.not-found',
                            'Save folder not found, please select it manually (click to retry)'
                          )}
                    </span>
                  }
                />
              </div>
            ))}

          <SelectField
            label={t('setting.manualsync.title')}
            htmlId="selectSyncType"
            onChange={(event) => setSyncType(event.target.value as SyncType)}
            value={syncType}
            disabled={!savePaths}
            extraClass="rightButtons"
            // style={{ marginRight: '12px' }}
            afterSelect={
              <button
                data-testid="setSync"
                onClick={async () => handleSync()}
                disabled={isSyncing || !savePaths}
                className={`button is-small ${
                  isSyncing ? 'is-primary' : 'settings'
                }`}
              >
                {`${
                  isSyncing
                    ? t('setting.manualsync.syncing')
                    : t('setting.manualsync.sync')
                }`}
              </button>
            }
          >
            {syncCommands.map((el, i) => (
              <option value={el.value} key={i}>
                {el.name}
              </option>
            ))}
          </SelectField>
          <ToggleSwitch
            htmlId="autosync"
            value={autoSyncSaves}
            disabled={!savePaths}
            handleChange={() => setAutoSyncSaves(!autoSyncSaves)}
            title={t('setting.autosync')}
          />
          <InfoBox text="infobox.help">
            <ul>
              <li>{t('help.sync.part1')}</li>
              {!isWin && <li>{t('help.sync.part2')}</li>}
              <li>{t('help.sync.part3')}</li>
              <li>{t('help.sync.part4')}</li>
            </ul>
          </InfoBox>
        </>
      )}
    </>
  )
}
