import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Backspace, CreateNewFolder } from '@mui/icons-material'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  InfoBox,
  SelectField,
  TextInputWithIconField,
  ToggleSwitch
} from 'frontend/components/UI'
import { syncSaves } from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'
import { SyncType } from 'frontend/types'
import { ProgressDialog } from 'frontend/components/UI/ProgressDialog'
import SettingsContext from '../../SettingsContext'
import TextWithProgress from 'frontend/components/UI/TextWithProgress'

interface Props {
  autoSyncSaves: boolean
  isProton?: boolean
  savesPath: string
  setAutoSyncSaves: (value: boolean) => void
  setSavesPath: (value: string) => void
  winePrefix?: string
  syncCommands: { name: string; value: string }[]
}

export default function LegendarySyncSaves({
  savesPath,
  setSavesPath,
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
  const { appName } = useContext(SettingsContext)

  useEffect(() => {
    const setDefaultSaveFolder = async () => {
      if (savesPath.length && !retry) {
        return
      }
      setLoading(true)
      const newSavePath = (await window.api.getDefaultSavePath(
        appName,
        'legendary'
      )) as string

      setSavesPath(newSavePath)
      setLoading(false)
      setRetry(false)
    }
    setDefaultSaveFolder()
  }, [winePrefix, isProton, retry])

  const isLinked = Boolean(savesPath.length)

  async function handleSync() {
    setIsSyncing(true)

    await syncSaves(savesPath, appName, 'legendary', syncType).then(
      (response: string) => {
        setManuallyOutput(response.split('\n'))
        setManuallyOutputShow(true)
      }
    )
    setIsSyncing(false)
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
          <TextInputWithIconField
            htmlId="inputSavePath"
            placeholder={t('setting.savefolder.placeholder')}
            value={savesPath}
            disabled={isSyncing}
            onChange={(event) => setSavesPath(event.target.value)}
            icon={
              !isLinked ? (
                <CreateNewFolder
                  data-testid="selectSavePath"
                  style={{ color: '#B0ABB6' }}
                />
              ) : (
                <Backspace
                  data-testid="removeSavePath"
                  style={{ color: '#B0ABB6' }}
                />
              )
            }
            onIconClick={
              !isLinked
                ? async () =>
                    window.api
                      .openDialog({
                        buttonLabel: t('box.sync.button'),
                        properties: ['openDirectory'],
                        title: t('box.sync.title')
                      })
                      .then((path) => setSavesPath(path || ''))
                : () => setSavesPath('')
            }
            afterInput={
              <span
                role={'button'}
                onClick={() => setRetry(true)}
                className="smallMessage"
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
              </span>
            }
          />

          <SelectField
            label={t('setting.manualsync.title')}
            htmlId="selectSyncType"
            onChange={(event) => setSyncType(event.target.value as SyncType)}
            value={syncType}
            disabled={!savesPath.length}
            extraClass="rightButtons"
            // style={{ marginRight: '12px' }}
            afterSelect={
              <button
                data-testid="setSync"
                onClick={async () => handleSync()}
                disabled={isSyncing || !savesPath.length}
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
            disabled={!savesPath.length}
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
