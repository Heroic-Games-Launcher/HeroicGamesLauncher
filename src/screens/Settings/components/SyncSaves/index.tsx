import { IpcRenderer } from 'electron'
import React, { useContext, useEffect, useState } from 'react'

import { Path, SyncType } from 'src/types'
import { fixSaveFolder, getGameInfo, syncSaves } from 'src/helpers'
import { useTranslation } from 'react-i18next'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}
import {
  InfoBox,
  ToggleSwitch,
  SelectField,
  TextInputWithIconField
} from 'src/components/UI'

import Backspace from '@mui/icons-material/Backspace'
import ContextProvider from 'src/state/ContextProvider'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'

interface Props {
  appName: string
  autoSyncSaves: boolean
  isProton?: boolean
  savesPath: string
  setAutoSyncSaves: (value: boolean) => void
  setSavesPath: (value: string) => void
  winePrefix?: string
}

export default function SyncSaves({
  savesPath,
  setSavesPath,
  appName,
  autoSyncSaves,
  setAutoSyncSaves,
  isProton,
  winePrefix
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncType, setSyncType] = useState('--skip-upload')
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  useEffect(() => {
    const getSyncFolder = async () => {
      const {
        save_folder,
        install: { install_path }
      } = await getGameInfo(appName)
      setAutoSyncSaves(autoSyncSaves)
      const prefix = winePrefix ? winePrefix : ''
      let folder = await fixSaveFolder(save_folder, prefix, isProton || false)
      folder = folder.replace('{InstallDir}', `${install_path}`)
      const path = savesPath ? savesPath : folder
      const fixedPath = isWin
        ? path.replaceAll('/', '\\')
        : path.replaceAll(/\\/g, '/') // invert slashes and remove latest on windows
      setSavesPath(fixedPath)
    }
    getSyncFolder()
  }, [winePrefix, isProton])

  const isLinked = Boolean(savesPath.length)

  const syncCommands = [
    { name: t('setting.manualsync.download'), value: '--skip-upload' },
    { name: t('setting.manualsync.upload'), value: '--skip-download' },
    { name: t('setting.manualsync.forcedownload'), value: '--force-download' },
    { name: t('setting.manualsync.forceupload'), value: '--force-upload' }
  ]

  async function handleSync() {
    setIsSyncing(true)

    await syncSaves(savesPath, appName, syncType).then(async (res: string) =>
      ipcRenderer.invoke('openMessageBox', {
        message: res,
        title: 'Saves Sync'
      })
    )
    setIsSyncing(false)
  }

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.sync')}</h3>

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
                ipcRenderer
                  .invoke('openDialog', {
                    buttonLabel: t('box.sync.button'),
                    properties: ['openDirectory'],
                    title: t('box.sync.title')
                  })
                  .then(({ path }: Path) => setSavesPath(path ? `${path}` : ''))
            : () => setSavesPath('')
        }
      />

      <SelectField
        label={t('setting.manualsync.title')}
        htmlId="selectSyncType"
        onChange={(event) => setSyncType(event.target.value as SyncType)}
        value={syncType}
        disabled={!savesPath.length}
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
  )
}
