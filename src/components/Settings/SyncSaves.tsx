import React, { useEffect, useState } from 'react'
import { fixSaveFolder, getGameInfo, syncSaves } from '../../helper'
import { Path, SyncType } from '../../types'
import InfoBox from '../UI/InfoBox'
import ToggleSwitch from '../UI/ToggleSwitch'

const {
  remote: { dialog },
} = window.require('electron')

interface Props {
  savesPath: string
  setSavesPath: (value: string) => void
  appName: string
  autoSyncSaves: boolean
  setAutoSyncSaves: (value: boolean) => void
  defaultFolder: string
  isProton: boolean
  winePrefix: string
}

export default function SyncSaves({
  savesPath,
  setSavesPath,
  appName,
  autoSyncSaves,
  setAutoSyncSaves,
  defaultFolder,
  isProton,
  winePrefix,
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncType, setSyncType] = useState('Download' as SyncType)

  useEffect(() => {
    const getSyncFolder = async () => {
      const { saveFolder, install_path } = await getGameInfo(appName)

      setAutoSyncSaves(autoSyncSaves)
      let folder = await fixSaveFolder(saveFolder, winePrefix, isProton)
      folder = folder.replace('{InstallDir}', install_path)
      const path = savesPath ? savesPath : folder
      console.log(path)

      setSavesPath(path)
    }
    getSyncFolder()
  }, [winePrefix, isProton])

  const isLinked = Boolean(savesPath.length)
  const syncTypes: SyncType[] = [
    'Download',
    'Upload',
    'Force download',
    'Force upload',
  ]
  async function handleSync() {
    setIsSyncing(true)
    const command = {
      Download: '--skip-upload',
      Upload: '--skip-download',
      'Force download': '--force-download',
      'Force upload': '--force-upload',
    }

    await syncSaves(savesPath, appName, command[syncType]).then((res: string) =>
      dialog.showMessageBox({ title: 'Saves Sync', message: res })
    )
    setIsSyncing(false)
  }

  return (
    <>
      <span className="setting">
        <span className="settingText">Override Cloud Sync Save folder</span>
        <span>
          <input
            type="text"
            placeholder={'Select the exact save games folder'}
            className="settingSelect"
            value={savesPath}
            disabled={isSyncing}
            onChange={(event) => setSavesPath(event.target.value)}
          />
          {!savesPath.length ? (
            <span
              className="material-icons settings folder"
              style={{ color: '#B0ABB6' }}
              onClick={() =>
                isLinked
                  ? ''
                  : dialog
                      .showOpenDialog({
                        title: 'Choose the saves directory',
                        buttonLabel: 'Choose',
                        defaultPath: defaultFolder,
                        properties: ['openDirectory'],
                      })
                      .then(({ filePaths }: Path) =>
                        setSavesPath(filePaths[0] ? `'${filePaths[0]}'` : '')
                      )
              }
            >
              create_new_folder
            </span>
          ) : (
            <span
              className="material-icons settings folder"
              onClick={() => setSavesPath('')}
              style={{ color: '#B0ABB6' }}
            >
              backspace
            </span>
          )}
        </span>
      </span>
      <span className="setting">
        <span className="settingText">Manual Sync</span>
        <span
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '513px',
          }}
        >
          <select
            onChange={(event) => setSyncType(event.target.value as SyncType)}
            value={syncType}
            disabled={!savesPath.length}
            className="settingSelect small"
          >
            {syncTypes.map((name: SyncType) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <button
            onClick={() => handleSync()}
            disabled={isSyncing || !savesPath.length}
            className={`button is-small ${
              isSyncing ? 'is-primary' : 'settings'
            }`}
          >
            {`${isSyncing ? 'Syncing' : 'Sync'}`}
          </button>
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          Sync Saves Automatically
          <ToggleSwitch
            value={autoSyncSaves}
            disabled={!savesPath.length}
            handleChange={() => setAutoSyncSaves(!autoSyncSaves)}
          />
        </span>
      </span>
      <InfoBox>
        <ul>
          <li>
            Heroic try to guess the right save folder and this will work on the
            majority of cases. In case the folder is wrong, use the override box
            to change it.
          </li>
          <li>
            In case you change the prefix folder or Wine for Proton and
            vice-versa, you will need to check the path again since proton uses
            a different prefix (/pfx) and username (steamuser). So you can
            simple erase the current path, get out of the sync settings page and
            get back again for Heroic to guess the folder one more time with the
            right prefix.
          </li>
          <li>
            Manual Sync: Choose Download to download the games saves stored on
            the Cloud. Upload to upload the local ones to the cloud. Force
            Download and Force Upload will ignore the version that is locally or
            on the cloud.
          </li>
          <li>
            Sync Saves Automatically will sync the saves every time you Start a
            Game and after finishing playing.
          </li>
        </ul>
      </InfoBox>
    </>
  )
}
