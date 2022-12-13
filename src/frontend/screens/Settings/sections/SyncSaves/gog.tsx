import React, { useContext, useEffect, useState } from 'react'
import { CircularProgress } from '@mui/material'
import ContextProvider from 'frontend/state/ContextProvider'
import { SyncType } from 'common/types'
import { GOGCloudSavesLocation } from 'common/types/gog'
import {
  InfoBox,
  SelectField,
  TextInputWithIconField,
  ToggleSwitch
} from 'frontend/components/UI'
import { Backspace, CreateNewFolder } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { ProgressDialog } from 'frontend/components/UI/ProgressDialog'
import SettingsContext from '../../SettingsContext'

interface Props {
  gogSaves: GOGCloudSavesLocation[]
  setGogSaves: (saves: GOGCloudSavesLocation[]) => void
  autoSyncSaves: boolean
  setAutoSyncSaves: (value: boolean) => void
  syncCommands: { name: string; value: string }[]
}

export default function GOGSyncSaves({
  gogSaves,
  setGogSaves,
  autoSyncSaves,
  setAutoSyncSaves,
  syncCommands
}: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncType, setSyncType] = useState('--skip-upload')
  const [manuallyOutput, setManuallyOutput] = useState<string[]>([])
  const [manuallyOutputShow, setManuallyOutputShow] = useState<boolean>(false)

  const { t } = useTranslation()

  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  const { appName } = useContext(SettingsContext)

  useEffect(() => {
    const getLocations = async () => {
      setIsLoading(true)
      const locations = (await window.api.getDefaultSavePath(
        appName,
        'gog',
        gogSaves
      )) as GOGCloudSavesLocation[]

      setGogSaves(locations)
      setIsLoading(false)
      setIsSyncing(false)
    }
    getLocations()
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)

    await window.api
      .syncGOGSaves(gogSaves, appName, syncType)
      .then(async (stderr) => {
        setManuallyOutput(stderr.split('\n'))
        setManuallyOutputShow(true)
      })

    setIsSyncing(false)
  }

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.sync')}</h3>
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
        <div className="link button is-text is-link" style={{ width: '100%' }}>
          {`${t(
            'info.save-sync.searching',
            'Trying to detect the correct save folder'
          )}... `}
          <CircularProgress className="link button is-text is-link" />
        </div>
      ) : (
        <>
          {gogSaves.map((value, index) => (
            <div key={`saves-${value.name}`} style={{ width: '100%' }}>
              <TextInputWithIconField
                htmlId="inputSavePath"
                placeholder={t('setting.savefolder.placeholder')}
                value={value.location}
                label={
                  t('settings.saves.label', 'Save Location:') + ' ' + value.name
                }
                disabled={isSyncing}
                onChange={(event: { target: { value: string } }) => {
                  const saves = [...gogSaves]
                  saves[index].location = event.target.value
                  setGogSaves(saves)
                }}
                icon={
                  !value.location.length ? (
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
                  !value.location.length
                    ? async () =>
                        window.api
                          .openDialog({
                            buttonLabel: t('box.sync.button'),
                            properties: ['openDirectory'],
                            title: t('box.sync.title')
                          })
                          .then((path) => {
                            const saves = [...gogSaves]
                            saves[index].location = path || ''
                            setGogSaves(saves)
                          })
                    : () => {
                        const saves = [...gogSaves]
                        saves[index].location = ''
                        setGogSaves(saves)
                      }
                }
                afterInput={
                  <span className="smallMessage">
                    {gogSaves.length > 1
                      ? t(
                          'setting.savefolder.warning',
                          'Please check twice if the path is correct'
                        )
                      : t(
                          'setting.savefolder.not-found',
                          'Save folder not found, please select it manually'
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
            disabled={!gogSaves.every((value) => value.location.length)}
            extraClass="rightButtons"
            // style={{ marginRight: '12px' }}
            afterSelect={
              <button
                data-testid="setSync"
                onClick={async () => handleSync()}
                disabled={
                  isSyncing || !gogSaves.every((value) => value.location.length)
                }
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
            disabled={!gogSaves.every((value) => value.name.length)}
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
