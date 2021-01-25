import React, { useContext, useState } from 'react'
import ContextProvider from '../../state/ContextProvider'
import { Path } from '../../types'
import InfoBox from '../UI/InfoBox'
import ToggleSwitch from '../UI/ToggleSwitch'
const {
  ipcRenderer,
  remote: { dialog },
} = window.require('electron')

interface Props {
  defaultInstallPath: string
  setDefaultInstallPath: (value: string) => void
  egsPath: string
  setEgsPath: (value: string) => void
  egsLinkedPath: string
  setEgsLinkedPath: (value: string) => void
  exitToTray: boolean
  toggleTray: () => void
}

export default function GeneralSettings({
  defaultInstallPath,
  setDefaultInstallPath,
  egsPath,
  setEgsPath,
  egsLinkedPath,
  setEgsLinkedPath,
  exitToTray,
  toggleTray,
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const { refreshLibrary } = useContext(ContextProvider)
  const isLinked = Boolean(egsLinkedPath.length)

  async function handleSync() {
    setIsSyncing(true)
    if (isLinked) {
      return await ipcRenderer.invoke('egsSync', 'unlink').then(async () => {
        await dialog.showMessageBox({
          title: 'EGS Sync',
          message: 'Unsync Complete',
        })
        setEgsLinkedPath('')
        setEgsPath('')
        setIsSyncing(false)
        refreshLibrary()
      })
    }

    return await ipcRenderer.invoke('egsSync', egsPath).then(async () => {
      await dialog.showMessageBox({
        title: 'EGS Sync',
        message: 'Sync Complete',
      })
      setIsSyncing(false)
      setEgsLinkedPath(egsPath)
      refreshLibrary()
    })
  }

  return (
    <>
      <span className="setting">
        <span className="settingText">Default Installation Path</span>
        <span>
          <input
            type="text"
            value={defaultInstallPath}
            className="settingSelect"
            placeholder={defaultInstallPath}
            onChange={(event) => setDefaultInstallPath(event.target.value)}
          />
          <span
            className="material-icons settings folder"
            onClick={() =>
              dialog
                .showOpenDialog({
                  title: 'Choose Default Instalation Folder',
                  buttonLabel: 'Choose',
                  properties: ['openDirectory'],
                })
                .then(({ filePaths }: Path) =>
                  setDefaultInstallPath(filePaths[0] ? `'${filePaths[0]}'` : '')
                )
            }
          >
            create_new_folder
          </span>
        </span>
      </span>
      <span className="setting">
        <span className="settingText">Sync with Installed Epic Games</span>
        <span>
          <input
            type="text"
            placeholder={'Prefix where EGS is installed'}
            className="settingSelect small"
            value={egsPath || egsLinkedPath}
            disabled={isLinked}
            onChange={(event) => setEgsPath(event.target.value)}
          />
          {!egsPath.length ? (
            <span
              className="material-icons settings folder"
              style={{ color: isLinked ? 'transparent' : '#B0ABB6' }}
              onClick={() =>
                isLinked
                  ? ''
                  : dialog
                      .showOpenDialog({
                        title: 'Choose Prefix where EGS is installed',
                        buttonLabel: 'Choose',
                        properties: ['openDirectory'],
                      })
                      .then(({ filePaths }: Path) =>
                        setEgsPath(filePaths[0] ? `'${filePaths[0]}'` : '')
                      )
              }
            >
              create_new_folder
            </span>
          ) : (
            <span
              className="material-icons settings folder"
              onClick={() => (isLinked ? '' : setEgsPath(''))}
              style={
                isLinked
                  ? { pointerEvents: 'none', color: 'transparent' }
                  : { color: '#B0ABB6' }
              }
            >
              backspace
            </span>
          )}
          <button
            onClick={() => handleSync()}
            disabled={isSyncing || !egsPath.length}
            className={`button is-small ${
              isLinked ? 'is-danger' : isSyncing ? 'is-primary' : 'settings'
            }`}
          >
            {`${isLinked ? 'Unsync' : isSyncing ? 'Syncing' : 'Sync'}`}
          </button>
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          Exit to System Tray
          <ToggleSwitch value={exitToTray} handleChange={toggleTray} />
        </span>
      </span>
      <InfoBox>
        Sync with EGS in case you have a working installation of the Epic Games
        Store elsewhere and want to import your games to avoid downloading them
        again.
      </InfoBox>
    </>
  )
}
