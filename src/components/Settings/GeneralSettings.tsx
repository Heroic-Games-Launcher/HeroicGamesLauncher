import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../../state/ContextProvider'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'
import Backspace from '@material-ui/icons/Backspace'
import { Path } from '../../types'
import InfoBox from '../UI/InfoBox'
import ToggleSwitch from '../UI/ToggleSwitch'
import LanguageSelector from '../UI/LanguageSelector'
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
  language: string
  setLanguage: (value: string) => void
  maxWorkers: number
  setMaxWorkers: (value: number) => void
  darkTrayIcon: boolean
  toggleDarkTrayIcon: () => void
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
  language,
  setLanguage,
  maxWorkers,
  setMaxWorkers,
  darkTrayIcon,
  toggleDarkTrayIcon,
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [maxCpus, setMaxCpus] = useState(maxWorkers)
  const { refreshLibrary } = useContext(ContextProvider)
  const { t, i18n } = useTranslation()
  const isLinked = Boolean(egsLinkedPath.length)

  useEffect(() => {
    i18n.changeLanguage(language)
    storage.setItem('language', language)
  }, [language])

  useEffect(() => {
    const getMaxCpus = async () => {
      const cores = await ipcRenderer.invoke('getMaxCpus')
      setMaxCpus(cores)
    }
    getMaxCpus()
  }, [maxWorkers])

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

  async function handleChangeLanguage(language: string) {
    ipcRenderer.send('changeLanguage', language)
    setLanguage(language)
  }

  return (
    <>
      <span className="setting">
        <span className="settingText">{t('setting.language')}</span>
        <LanguageSelector
          handleLanguageChange={handleChangeLanguage}
          currentLanguage={language}
        />
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
          <CreateNewFolder
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
          />
        </span>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.egs-sync')}</span>
        <span className="settingInputWithButton">
          <input
            type="text"
            placeholder={t('placeholder.egs-prefix')}
            className="settingSelect"
            value={egsPath || egsLinkedPath}
            disabled={isLinked}
            onChange={(event) => setEgsPath(event.target.value)}
          />
          {!egsPath.length ? (
            <CreateNewFolder
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
            />
          ) : (
            <Backspace
              className="material-icons settings folder"
              onClick={() => (isLinked ? '' : setEgsPath(''))}
              style={
                isLinked
                  ? { pointerEvents: 'none', color: 'transparent' }
                  : { color: '#B0ABB6' }
              }
            />
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
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.darktray', 'Use Dark Tray Icon (needs restart)')}
          <ToggleSwitch
            value={darkTrayIcon}
            handleChange={toggleDarkTrayIcon}
          />
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.maxworkers')}
          <select
            onChange={(event) => setMaxWorkers(Number(event.target.value))}
            value={maxWorkers}
            className="settingSelect smaller"
          >
            {Array.from(Array(maxCpus).keys()).map((n) => (
              <option key={n + 1}>{n + 1}</option>
            ))}
            <option key={0} value={0}>
              Max
            </option>
          </select>
        </span>
      </span>
      <InfoBox text="infobox.help">{t('help.general')}</InfoBox>
    </>
  )
}
