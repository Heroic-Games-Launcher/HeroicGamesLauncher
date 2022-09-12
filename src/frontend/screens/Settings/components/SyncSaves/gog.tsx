import React, { useContext, useEffect, useState } from 'react'
import { CircularProgress } from '@mui/material'
import { fixGogSaveFolder, getGameInfo } from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'
import { SyncType } from 'common/types'
import { GOGCloudSavesLocation } from 'common/types/gog'
import { Path } from 'frontend/types'
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

interface Props {
  appName: string
  gogSaves: GOGCloudSavesLocation[]
  setGogSaves: (saves: GOGCloudSavesLocation[]) => void
  autoSyncSaves: boolean
  setAutoSyncSaves: (value: boolean) => void
  syncCommands: { name: string; value: string }[]
}

export default function GOGSyncSaves({
  appName,
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

  useEffect(() => {
    const getLocations = async () => {
      const {
        gog_save_location,
        install: { platform: installed_platform, install_path }
      } = await getGameInfo(appName, 'gog')
      const clientId = await window.api.getGOGGameClientId(appName)
      if (!gog_save_location) {
        return
      }
      setIsLoading(true)
      const locations = gogSaves
      if (gog_save_location?.length === 0) {
        gog_save_location.push({
          name: '__default',
          location:
            installed_platform === 'windows'
              ? `%LocalAppData%/GOG.com/Galaxy/Applications/${clientId}/Storage/Shared/Files`
              : `$HOME/Library/Application Support/GOG.com/Galaxy/Applications/${clientId}/Storage`
        })
      }

      const isMacNative = installed_platform === 'osx'
      const isLinuxNative = installed_platform === 'linux'
      const isNative = isWin || isMacNative || isLinuxNative

      for (const loc of gog_save_location) {
        const { name, location } = loc
        const locationIndex = locations.findIndex(
          (value) => value.name === name
        )
        if (locationIndex >= 0 && locations[locationIndex]?.location.length) {
          continue // Skip fetching the path if it's already set
        }
        const saveLocation = await fixGogSaveFolder(
          location.replace('<?INSTALL?>', String(install_path)),
          String(installed_platform),
          appName
        )
        let actualPath: string
        if (!isNative) {
          const { stdout } = await window.api
            .runWineCommandForGame({
              appName,
              runner: 'gog',
              command: `cmd /c winepath "${saveLocation}"`
            })
            .catch((error) => {
              window.api.logError(
                `There was an error getting the save path ${error}`
              )
              setIsLoading(false)
              return { stdout: '' }
            })
          actualPath = stdout.trim()
        } else {
          actualPath = await window.api.getShellPath(saveLocation)
        }

        actualPath = isWin
          ? actualPath
          : await window.api.getRealPath(actualPath)

        if (locationIndex >= 0 && !locations[locationIndex]?.location.length) {
          locations[locationIndex].location = actualPath
        } else if (locationIndex < 0) {
          locations.push({ name, location: actualPath })
        }
      }
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
      .then(async (res: { stderr: string }) => {
        setManuallyOutput(res.stderr.split('\n'))
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
                          .then(({ path }: Path) => {
                            const saves = [...gogSaves]
                            saves[index].location = path ?? ''
                            setGogSaves(saves)
                          })
                    : () => {
                        const saves = [...gogSaves]
                        saves[index].location = ''
                        setGogSaves(saves)
                      }
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
