import React, {
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
import InfoBox from 'src/components/UI/InfoBox'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'

import Backspace from '@material-ui/icons/Backspace'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'

const {
  remote: { dialog }
} = window.require('electron')

interface Props {
  appName: string
  autoSyncSaves: boolean
  defaultFolder: string
  isProton: boolean
  savesPath: string
  setAutoSyncSaves: (value: boolean) => void
  setSavesPath: (value: string) => void
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
  winePrefix
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncType, setSyncType] = useState('Download' as SyncType)
  const { t } = useTranslation()

  useEffect(() => {
    const getSyncFolder = async () => {
      const { save_folder, install:{install_path} } = await getGameInfo(appName)

      setAutoSyncSaves(autoSyncSaves)
      let folder = await fixSaveFolder(save_folder, winePrefix, isProton)
      folder = folder.replace('{InstallDir}', `${install_path}`)
      const path = savesPath ? savesPath : folder

      setSavesPath(path)
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
      dialog.showMessageBox({ message: res, title: 'Saves Sync' })
    )
    setIsSyncing(false)
  }

  return (
    <>
      <span className="setting">
        <span className="settingText">{t('setting.savefolder.title')}</span>
        <span>
          <input
            type="text"
            placeholder={t('setting.savefolder.placeholder')}
            className="settingSelect"
            value={savesPath}
            disabled={isSyncing}
            onChange={(event) => setSavesPath(event.target.value)}
          />
          {!savesPath.length ? (
            <CreateNewFolder
              className="material-icons settings folder"
              style={{ color: '#B0ABB6' }}
              onClick={() =>
                isLinked
                  ? ''
                  : dialog
                    .showOpenDialog({
                      buttonLabel: t('box.sync.button'),
                      defaultPath: defaultFolder,
                      properties: ['openDirectory'],
                      title: t('box.sync.title')
                    })
                    .then(({ filePaths }: Path) =>
                      setSavesPath(filePaths[0] ? `${filePaths[0]}` : '')
                    )
              }
            />
          ) : (
            <Backspace
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
            {`${
              isSyncing
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
          <li>{t('help.sync.part2')}</li>
          <li>{t('help.sync.part3')}</li>
          <li>{t('help.sync.part4')}</li>
        </ul>
      </InfoBox>
    </>
  )
}
