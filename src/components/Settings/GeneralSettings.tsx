import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../../state/ContextProvider'
import { Path } from '../../types'
import InfoBox from '../UI/InfoBox'
import ToggleSwitch from '../UI/ToggleSwitch'
const {
  ipcRenderer,
  remote: { dialog },
} = window.require('electron')
const { showErrorBox, showMessageBox, showOpenDialog } = dialog
const storage: Storage = window.localStorage

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
  const { t, i18n } = useTranslation()
  const isLinked = Boolean(egsLinkedPath.length)
  const [language, setLanguage] = useState(
    () => storage.getItem('language') || ''
  )

  useEffect(() => {
    i18n.changeLanguage(language)
    storage.setItem('language', language)
  }, [language])

  async function handleSync() {
    setIsSyncing(true)
    if (isLinked) {
      return await ipcRenderer.invoke('egsSync', 'unlink').then(async () => {
        await showMessageBox({
          title: 'EGS Sync',
          message: t('message.unsync'),
        })
        setEgsLinkedPath('')
        setEgsPath('')
        setIsSyncing(false)
        refreshLibrary()
      })
    }

    return await ipcRenderer
      .invoke('egsSync', egsPath)
      .then(async (res: string) => {
        if (res === 'Error') {
          setIsSyncing(false)
          showErrorBox(t('box.error'), t('box.sync.error'))
          setEgsLinkedPath('')
          setEgsPath('')
          return
        }
        await dialog.showMessageBox({
          title: 'EGS Sync',
          message: t('message.sync'),
        })

        setIsSyncing(false)
        setEgsLinkedPath(egsPath)
        refreshLibrary()
      })
  }

  return (
    <>
      <span className="setting">
        <span className="settingText">{t('setting.language')}</span>
        <select
          onChange={(event) => setLanguage(event.target.value)}
          value={language}
          className="settingSelect"
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.default-install-path')}</span>
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
              showOpenDialog({
                title: t('box.default-install-path'),
                buttonLabel: t('box.choose'),
                properties: ['openDirectory'],
              }).then(({ filePaths }: Path) =>
                setDefaultInstallPath(filePaths[0] ? `'${filePaths[0]}'` : '')
              )
            }
          >
            create_new_folder
          </span>
        </span>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.egs-sync')}</span>
        <span>
          <input
            type="text"
            placeholder={t('placeholder.egs-prefix')}
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
                        title: t('box.choose-egs-prefix'),
                        buttonLabel: t('box.choose'),
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
            {`${
              isLinked
                ? t('button.unsync')
                : isSyncing
                ? t('button.syncing')
                : t('button.sync')
            }`}
          </button>
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.exit-to-tray')}
          <ToggleSwitch value={exitToTray} handleChange={toggleTray} />
        </span>
      </span>
      <InfoBox>{t('help.general')}</InfoBox>
    </>
  )
}
