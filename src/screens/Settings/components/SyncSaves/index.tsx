import { IpcRenderer } from 'electron'
import React, {
  useContext,
  useEffect,
  useState
} from 'react'

import {
  Path,
  SyncType
} from 'src/types'
import {
  fixSaveFolder,
  getGameInfo,
  syncSaves
} from 'src/helpers'
import { useTranslation } from 'react-i18next'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}
import InfoBox from 'src/components/UI/InfoBox'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'

import Backspace from '@material-ui/icons/Backspace'
import ContextProvider from 'src/state/ContextProvider'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'
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
  const [syncType, setSyncType] = useState('Download' as SyncType)
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  useEffect(() => {
    const getSyncFolder = async () => {
      const { save_folder, install: { install_path } } = await getGameInfo(appName)
      setAutoSyncSaves(autoSyncSaves)
      const prefix = winePrefix ? winePrefix : ''
      let folder = await fixSaveFolder(save_folder, prefix, isProton = false)
      folder = folder.replace('{InstallDir}', `${install_path}`)
      const path = savesPath ? savesPath : folder
      const fixedPath = isWin ? path.replaceAll('/', '\\') : path // invert slashes and remove latest on windows

      setSavesPath(fixedPath)
    }
    getSyncFolder()
  }, [winePrefix, isProton])

  const isLinked = Boolean(savesPath.length)
  const syncTypes: SyncType[] = [
    t('setting.manualsync.download'),
    t('setting.manualsync.upload'),
    t('setting.manualsync.forcedownload'),
    t('setting.manualsync.forceupload')
  ]

  async function handleSync() {
    setIsSyncing(true)
    const command = {
      Download: '--skip-upload',
      'Force download': '--force-download',
      'Force upload': '--force-upload',
      Upload: '--skip-download'
    }

    await syncSaves(savesPath, appName, command[syncType]).then((res: string) =>
      ipcRenderer.invoke('openMessageBox', { message: res, title: 'Saves Sync' })
    )
    setIsSyncing(false)
  }

  return (
    <>
      <span data-testid="syncSettings" className="setting">
        <span className="settingText">{t('setting.savefolder.title')}</span>
        <span>
          <input
            data-testid="inputSavePath"
            type="text"
            placeholder={t('setting.savefolder.placeholder')}
            className="settingSelect"
            value={savesPath}
            disabled={isSyncing}
            onChange={(event) => setSavesPath(event.target.value)}
          />
          {!isLinked ? (
            <CreateNewFolder
              data-testid="selectSavePath"
              className="material-icons settings folder"
              style={{ color: '#B0ABB6' }}
              onClick={() =>
                ipcRenderer.invoke('openDialog', {
                  buttonLabel: t('box.sync.button'),
                  properties: ['openDirectory'],
                  title: t('box.sync.title')
                })
                  .then(({ path }: Path) =>
                    setSavesPath(path ? `${path}` : '')
                  )
              }
            />
          ) : (
            <Backspace
              data-testid="removeSavePath"
              className="material-icons settings folder"
              onClick={() => setSavesPath('')}
              style={{ color: '#B0ABB6' }}
            />
          )}
        </span>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.manualsync.title')}</span>
        <span
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '513px'
          }}
        >
          <select
            data-testid="selectSyncType"
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
            data-testid="setSync"
            onClick={() => handleSync()}
            disabled={isSyncing || !savesPath.length}
            className={`button is-small ${isSyncing ? 'is-primary' : 'settings'
            }`}
          >
            {`${isSyncing
              ? t('setting.manualsync.syncing')
              : t('setting.manualsync.sync')
            }`}
          </button>
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.autosync')}
          <ToggleSwitch
            value={autoSyncSaves}
            disabled={!savesPath.length}
            handleChange={() => setAutoSyncSaves(!autoSyncSaves)}
          />
        </span>
      </span>
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
