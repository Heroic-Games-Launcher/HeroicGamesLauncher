import React, { useContext, useEffect, useState } from 'react'

import { LibraryTopSectionOptions, Path } from 'src/types'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import { InfoBox, SvgButton } from 'src/components/UI'
import LanguageSelector from 'src/components/UI/LanguageSelector'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'
import classNames from 'classnames'

import { IpcRenderer } from 'electron'
import Backspace from '@mui/icons-material/Backspace'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import { toggleControllerIsDisabled } from 'src/helpers/gamepad'
import { ThemeSelector } from 'src/components/UI/ThemeSelector'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

const storage: Storage = window.localStorage

interface Props {
  darkTrayIcon: boolean
  defaultInstallPath: string
  disableController: boolean
  egsLinkedPath: string
  egsPath: string
  exitToTray: boolean
  language: string
  maxWorkers: number
  showUnrealMarket: boolean
  minimizeOnLaunch: boolean
  setDefaultInstallPath: (value: string) => void
  setEgsLinkedPath: (value: string) => void
  setEgsPath: (value: string) => void
  setLanguage: (value: string) => void
  setMaxWorkers: (value: number) => void
  startInTray: boolean
  toggleDarkTrayIcon: () => void
  toggleDisableController: () => void
  toggleStartInTray: () => void
  toggleTray: () => void
  toggleMinimizeOnLaunch: () => void
  toggleUnrealMarket: () => void
}

export default function GeneralSettings({
  defaultInstallPath,
  setDefaultInstallPath,
  egsPath,
  setEgsPath,
  egsLinkedPath,
  setEgsLinkedPath,
  showUnrealMarket,
  exitToTray,
  startInTray,
  toggleTray,
  toggleStartInTray,
  toggleUnrealMarket,
  language,
  setLanguage,
  maxWorkers,
  setMaxWorkers,
  darkTrayIcon,
  toggleDarkTrayIcon,
  minimizeOnLaunch,
  toggleMinimizeOnLaunch,
  disableController,
  toggleDisableController
}: Props) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [maxCpus, setMaxCpus] = useState(maxWorkers)
  const {
    platform,
    refreshLibrary,
    isRTL,
    libraryTopSection,
    handleLibraryTopSection
  } = useContext(ContextProvider)
  const { t, i18n } = useTranslation()
  const isLinked = Boolean(egsLinkedPath.length)
  const isWindows = platform === 'win32'

  useEffect(() => {
    i18n.changeLanguage(language)
    storage.setItem('language', language)
  }, [i18n, language])

  useEffect(() => {
    const getMoreInfo = async () => {
      const cores = await ipcRenderer.invoke('getMaxCpus')
      setMaxCpus(cores)
    }
    getMoreInfo()
  }, [maxWorkers])

  async function handleSync() {
    setIsSyncing(true)
    if (isLinked) {
      return ipcRenderer.invoke('egsSync', 'unlink').then(async () => {
        await ipcRenderer.invoke('openMessageBox', {
          message: t('message.unsync'),
          title: 'EGS Sync'
        })
        setEgsLinkedPath('')
        setEgsPath('')
        setIsSyncing(false)
        refreshLibrary({ fullRefresh: true, runInBackground: false })
      })
    }

    return ipcRenderer.invoke('egsSync', egsPath).then(async (res: string) => {
      if (res === 'Error') {
        setIsSyncing(false)
        ipcRenderer.invoke('showErrorBox', [
          t('box.error.title', 'Error'),
          t('box.sync.error')
        ])
        setEgsLinkedPath('')
        setEgsPath('')
        return
      }
      await ipcRenderer.invoke('openMessageBox', {
        message: t('message.sync'),
        title: 'EGS Sync'
      })

      setIsSyncing(false)
      setEgsLinkedPath(isWindows ? 'windows' : egsPath)
      refreshLibrary({ fullRefresh: true, runInBackground: false })
    })
  }

  function handleEgsFolder() {
    if (isLinked) {
      return ''
    }
    return ipcRenderer
      .invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.choose-egs-prefix')
      })
      .then(({ path }: Path) => setEgsPath(path ? path : ''))
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
        <span className={classNames('settingText', { isRTL: isRTL })}>
          {t('setting.language')}
        </span>
        <LanguageSelector
          handleLanguageChange={handleChangeLanguage}
          currentLanguage={language}
        />
        <a
          data-testid="buttonWeblate"
          onClick={handleWeblate}
          className="smallLink"
        >
          {t('other.weblate', 'Help Improve this translation.')}
        </a>
      </span>
      <span className="setting">
        <span className={classNames('settingText', { isRTL: isRTL })}>
          {t('setting.default-install-path')}
        </span>
        <span className="settingInputWithButton">
          <input
            data-testid="setinstallpath"
            type="text"
            value={defaultInstallPath.replaceAll("'", '')}
            className="settingSelect"
            placeholder={defaultInstallPath}
            onChange={(event) => setDefaultInstallPath(event.target.value)}
          />
          <SvgButton
            onClick={async () =>
              ipcRenderer
                .invoke('openDialog', {
                  buttonLabel: t('box.choose'),
                  properties: ['openDirectory'],
                  title: t('box.default-install-path')
                })
                .then(({ path }: Path) =>
                  setDefaultInstallPath(path ? `${path}` : defaultInstallPath)
                )
            }
            className="material-icons settings folder"
          >
            <CreateNewFolder data-testid="setinstallpathbutton" />
          </SvgButton>
        </span>
      </span>
      {!isWindows && (
        <span className="setting">
          <span className={classNames('settingText', { isRTL: isRTL })}>
            {t('setting.egs-sync')}
          </span>
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
              <SvgButton
                onClick={() => handleEgsFolder()}
                className="material-icons settings folder"
              >
                <CreateNewFolder
                  data-testid="setEpicSyncPathButton"
                  style={{ color: isLinked ? 'transparent' : 'currentColor' }}
                />
              </SvgButton>
            ) : (
              <SvgButton
                className="material-icons settings folder"
                onClick={() => (isLinked ? '' : setEgsPath(''))}
              >
                <Backspace
                  data-testid="setEpicSyncPathBackspace"
                  style={
                    isLinked
                      ? { color: 'transparent', pointerEvents: 'none' }
                      : { color: '#B0ABB6' }
                  }
                />
              </SvgButton>
            )}
            <button
              data-testid="syncButton"
              onClick={async () => handleSync()}
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
          {!isWindows && (
            <InfoBox text="infobox.help">{t('help.general')}</InfoBox>
          )}
        </span>
      )}

      {isWindows && (
        <span className="setting">
          <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <ToggleSwitch
              dataTestId="syncToggle"
              value={isLinked}
              handleChange={handleSync}
              title={t('setting.egs-sync')}
            />
            <span>{t('setting.egs-sync')}</span>
          </label>
        </span>
      )}
      <span className="setting">
        <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
          <ToggleSwitch
            dataTestId="exitToTray"
            value={exitToTray}
            handleChange={toggleTray}
            title={t('setting.exit-to-tray')}
          />
          <span>{t('setting.exit-to-tray')}</span>
        </label>
      </span>
      {exitToTray && (
        <span className="setting">
          <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <ToggleSwitch
              dataTestId="startInTray"
              value={startInTray}
              handleChange={toggleStartInTray}
              title={t('setting.start-in-tray', 'Start Minimized')}
            />
            <span>{t('setting.start-in-tray', 'Start Minimized')}</span>
          </label>
        </span>
      )}
      <span className="setting">
        <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
          <ToggleSwitch
            dataTestId="minimizeOnLaunch"
            value={minimizeOnLaunch}
            handleChange={toggleMinimizeOnLaunch}
            title={t(
              'setting.minimize-on-launch',
              'Minimize Heroic After Game Launch'
            )}
          />
          <span>
            {t(
              'setting.minimize-on-launch',
              'Minimize Heroic After Game Launch'
            )}
          </span>
        </label>
      </span>
      <span className="setting">
        <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
          <ToggleSwitch
            value={showUnrealMarket}
            handleChange={() => toggleUnrealMarket()}
            title={t(
              'setting.showUnrealMarket',
              'Show Unreal Marketplace (needs restart)'
            )}
          />
          <span>
            {t(
              'setting.showUnrealMarket',
              'Show Unreal Marketplace (needs restart)'
            )}
          </span>
        </label>
      </span>
      <span className="setting">
        <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
          <ToggleSwitch
            value={darkTrayIcon}
            handleChange={() => {
              toggleDarkTrayIcon()
              return ipcRenderer.send('changeTrayColor')
            }}
            title={t('setting.darktray', 'Use Dark Tray Icon (needs restart)')}
          />
          <span>{t('setting.darktray', 'Use Dark Tray Icon')}</span>
        </label>
      </span>
      <span className="setting">
        <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
          <ToggleSwitch
            value={disableController}
            handleChange={() => {
              toggleDisableController()
              toggleControllerIsDisabled(!disableController)
            }}
            title={t(
              'setting.disable_controller',
              'Disable Heroic navigation using controller'
            )}
          />
          <span>
            {t(
              'setting.disable_controller',
              'Disable Heroic navigation using controller'
            )}
          </span>
        </label>
      </span>

      <span className="setting">
        <label
          className={classNames('settingText', { isRTL: isRTL })}
          htmlFor="library_top_section_selector"
        >
          {t('setting.library_top_section', 'Library Top Section')}
        </label>
        <select
          id="library_top_section_selector"
          onChange={(event) =>
            handleLibraryTopSection(
              event.target.value as LibraryTopSectionOptions
            )
          }
          value={libraryTopSection}
          className="settingSelect is-drop-down"
        >
          <option value="recently_played">
            {t(
              'setting.library_top_option.recently_played',
              'Recently Played Games'
            )}
          </option>
          <option value="favourites">
            {t('setting.library_top_option.favourites', 'Favourite Games')}
          </option>
          <option value="disabled">
            {t('setting.library_top_option.disabled', 'Disabled')}
          </option>
        </select>
      </span>
      <ThemeSelector />
      <span className="setting">
        <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
          <select
            data-testid="setMaxWorkers"
            onChange={(event) => setMaxWorkers(Number(event.target.value))}
            value={maxWorkers}
            className="settingSelect smaller is-drop-down"
          >
            {Array.from(Array(maxCpus).keys()).map((n) => (
              <option key={n + 1}>{n + 1}</option>
            ))}
            <option key={0} value={0}>
              Max
            </option>
          </select>
          <span>{t('setting.maxworkers')}</span>
        </label>
      </span>
    </>
  )
}
