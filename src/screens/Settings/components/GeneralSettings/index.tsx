import React, {
  useContext,
  useEffect,
  useState
} from 'react'

import { Path } from 'src/types'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import InfoBox from 'src/components/UI/InfoBox'
import LanguageSelector from 'src/components/UI/LanguageSelector'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'

import { IpcRenderer } from 'electron'
import Backspace from '@material-ui/icons/Backspace'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'

const {
  ipcRenderer
} = window.require('electron') as {ipcRenderer: IpcRenderer}

const storage: Storage = window.localStorage

interface Props {
  addDesktopShortcuts: boolean,
  addGamesToStartMenu: boolean,
  darkTrayIcon: boolean,
  defaultInstallPath: string,
  egsLinkedPath: string,
  egsPath: string,
  exitToTray: boolean,
  language: string,
  maxWorkers: number,
  setDefaultInstallPath: (value: string) => void,
  setEgsLinkedPath: (value: string) => void,
  setEgsPath: (value: string) => void,
  setLanguage: (value: string) => void,
  setMaxWorkers: (value: number) => void,
  toggleAddDesktopShortcuts: () => void,
  toggleAddGamesToStartMenu: () => void,
  toggleDarkTrayIcon: () => void,
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
  language,
  setLanguage,
  maxWorkers,
  setMaxWorkers,
  darkTrayIcon,
  toggleDarkTrayIcon,
  addDesktopShortcuts,
  addGamesToStartMenu,
  toggleAddDesktopShortcuts,
  toggleAddGamesToStartMenu
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
        await ipcRenderer.invoke('openMessageBox', {
          message: t('message.unsync'),
          title: 'EGS Sync'
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
          ipcRenderer.invoke('showErrorBox', {content: t('box.sync.error'), title: t('box.error')})
          setEgsLinkedPath('')
          setEgsPath('')
          return
        }
        await ipcRenderer.invoke('openMessageBox', {
          message: t('message.sync'),
          title: 'EGS Sync'
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

  function handleWeblate() {
    return ipcRenderer.send('openWeblate')
  }

  return (
    <>
      <span className="setting" data-testid="generalSettings">
        <span className="settingText">{t('setting.language')}</span>
        <LanguageSelector
          handleLanguageChange={handleChangeLanguage}
          currentLanguage={language}
        />
        <a data-testid="buttonWeblate" onClick={handleWeblate} className="smallMessage">{t('other.weblate', 'Help Improve this translation.')}</a>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.default-install-path')}</span>
        <span>
          <input
            data-testid="setinstallpath"
            type="text"
            value={defaultInstallPath}
            className="settingSelect"
            placeholder={defaultInstallPath}
            onChange={(event) => setDefaultInstallPath(event.target.value)}
          />
          <CreateNewFolder
            data-testid="setinstallpathbutton"
            className="material-icons settings folder"
            onClick={() =>
              ipcRenderer.invoke('openDialog', {
                buttonLabel: t('box.choose'),
                properties: ['openDirectory'],
                title: t('box.default-install-path')
              }).then(({ path }: Path) =>
                setDefaultInstallPath(path ? `'${path}'` : '')
              )
            }
          />
        </span>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.egs-sync')}</span>
        <span className="settingInputWithButton">
          <input
            data-testid="setEpicSyncPath"
            type="text"
            placeholder={t('placeholder.egs-prefix')}
            className="settingSelect"
            value={egsPath || egsLinkedPath}
            disabled={isLinked}
            onChange={(event) => setEgsPath(event.target.value)}
          />
          {!egsPath.length ? (
            <CreateNewFolder
              data-testid="setEpicSyncPathButton"
              className="material-icons settings folder"
              style={{ color: isLinked ? 'transparent' : '#B0ABB6' }}
              onClick={() =>
                isLinked
                  ? ''
                  : ipcRenderer.invoke(
                    'openDialog', {
                      buttonLabel: t('box.choose'),
                      properties: ['openDirectory'],
                      title: t('box.choose-egs-prefix')
                    })
                    .then(({ path }: Path) =>
                      setEgsPath(path ? `'${path}'` : '')
                    )
              }
            />
          ) : (
            <Backspace
              data-testid="setEpicSyncPathBackspace"
              className="material-icons settings folder"
              onClick={() => (isLinked ? '' : setEgsPath(''))}
              style={
                isLinked
                  ? { color: 'transparent', pointerEvents: 'none' }
                  : { color: '#B0ABB6' }
              }
            />
          )}
          <button
            data-testid="syncButton"
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
          {t('setting.adddesktopshortcuts', 'Add desktop shortcuts automatically')} (Linux)
          <ToggleSwitch
            value={addDesktopShortcuts}
            disabled={!navigator.platform.startsWith('Linux')}
            handleChange={toggleAddDesktopShortcuts}
          />
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.addgamestostartmenu', 'Add games to start menu automatically')} (Linux)
          <ToggleSwitch
            value={addGamesToStartMenu}
            disabled={!navigator.platform.startsWith('Linux')}
            handleChange={toggleAddGamesToStartMenu}
          />
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.maxworkers')}
          <select
            data-testid="setMaxWorkers"
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
