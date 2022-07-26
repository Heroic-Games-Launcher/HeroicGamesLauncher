import React, { useContext, useEffect, useState } from 'react'

import { LibraryTopSectionOptions, Path } from 'common/types'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { InfoBox, SelectField, ToggleSwitch } from 'frontend/components/UI'
import LanguageSelector from 'frontend/components/UI/LanguageSelector'

import Backspace from '@mui/icons-material/Backspace'
import { toggleControllerIsDisabled } from 'frontend/helpers/gamepad'
import TextInputWithIconField from 'frontend/components/UI/TextInputWithIconField'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'

import { ipcRenderer } from 'frontend/helpers'
interface Props {
  darkTrayIcon: boolean
  defaultInstallPath: string
  disableController: boolean
  egsLinkedPath: string
  egsPath: string
  exitToTray: boolean
  maxWorkers: number
  showUnrealMarket: boolean
  minimizeOnLaunch: boolean
  setDefaultInstallPath: (value: string) => void
  setEgsLinkedPath: (value: string) => void
  setEgsPath: (value: string) => void
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
    libraryTopSection,
    handleLibraryTopSection
  } = useContext(ContextProvider)
  const { t } = useTranslation()
  const isLinked = Boolean(egsLinkedPath.length)
  const isWindows = platform === 'win32'

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

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.general')}</h3>

      <LanguageSelector />

      <TextInputWithIconField
        label={t('setting.default-install-path')}
        htmlId="default_install_path"
        value={defaultInstallPath?.replaceAll("'", '')}
        placeholder={defaultInstallPath}
        onChange={(event) => setDefaultInstallPath(event.target.value)}
        icon={
          <FontAwesomeIcon
            icon={faFolderOpen}
            data-testid="setinstallpathbutton"
          />
        }
        onIconClick={async () =>
          ipcRenderer
            .invoke('openDialog', {
              buttonLabel: t('box.choose'),
              properties: ['openDirectory'],
              title: t('box.default-install-path'),
              defaultPath: defaultInstallPath
            })
            .then(({ path }: Path) =>
              setDefaultInstallPath(path ? `${path}` : defaultInstallPath)
            )
        }
      />

      {!isWindows && (
        <TextInputWithIconField
          label={t('setting.egs-sync')}
          extraClass="withRightButton"
          htmlId="set_epic_sync_path"
          placeholder={t('placeholder.egs-prefix')}
          value={egsPath || egsLinkedPath}
          disabled={isLinked}
          onChange={(event) => setEgsPath(event.target.value)}
          icon={
            !egsPath.length ? (
              <FontAwesomeIcon
                icon={faFolderOpen}
                data-testid="setEpicSyncPathButton"
                style={{
                  color: isLinked ? 'transparent' : 'currentColor'
                }}
              />
            ) : (
              <Backspace
                data-testid="setEpicSyncPathBackspace"
                style={
                  isLinked
                    ? { color: 'transparent', pointerEvents: 'none' }
                    : { color: '#B0ABB6' }
                }
              />
            )
          }
          onIconClick={
            !egsPath.length
              ? () => handleEgsFolder()
              : () => (isLinked ? '' : setEgsPath(''))
          }
          afterInput={
            <>
              <span className="rightButton">
                <button
                  data-testid="syncButton"
                  onClick={async () => handleSync()}
                  disabled={isSyncing || !egsPath.length}
                  className={`button is-small ${
                    isLinked
                      ? 'is-danger'
                      : isSyncing
                      ? 'is-primary'
                      : 'settings'
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
              <div>
                {!isWindows && (
                  <InfoBox text="infobox.help">{t('help.general')}</InfoBox>
                )}
              </div>
            </>
          }
        />
      )}

      {isWindows && (
        <ToggleSwitch
          htmlId="syncToggle"
          value={isLinked}
          handleChange={handleSync}
          title={t('setting.egs-sync')}
        />
      )}

      <ToggleSwitch
        htmlId="exitToTray"
        value={exitToTray}
        handleChange={toggleTray}
        title={t('setting.exit-to-tray')}
      />

      {exitToTray && (
        <ToggleSwitch
          htmlId="startInTray"
          value={startInTray}
          handleChange={toggleStartInTray}
          title={t('setting.start-in-tray', 'Start Minimized')}
        />
      )}

      <ToggleSwitch
        htmlId="minimizeOnLaunch"
        value={minimizeOnLaunch}
        handleChange={toggleMinimizeOnLaunch}
        title={t(
          'setting.minimize-on-launch',
          'Minimize Heroic After Game Launch'
        )}
      />

      <ToggleSwitch
        htmlId="showUnrealMarket"
        value={showUnrealMarket}
        handleChange={() => toggleUnrealMarket()}
        title={t(
          'setting.showUnrealMarket',
          'Show Unreal Marketplace (needs restart)'
        )}
      />

      <ToggleSwitch
        htmlId="changeTrayColor"
        value={darkTrayIcon}
        handleChange={() => {
          toggleDarkTrayIcon()
          return ipcRenderer.send('changeTrayColor')
        }}
        title={t('setting.darktray', 'Use Dark Tray Icon (needs restart)')}
      />

      <ToggleSwitch
        htmlId="disableController"
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

      <SelectField
        label={t('setting.library_top_section', 'Library Top Section')}
        htmlId="library_top_section_selector"
        onChange={(event) =>
          handleLibraryTopSection(
            event.target.value as LibraryTopSectionOptions
          )
        }
        value={libraryTopSection}
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
      </SelectField>

      <SelectField
        htmlId="max_workers"
        label={t('setting.maxworkers')}
        onChange={(event) => setMaxWorkers(Number(event.target.value))}
        value={maxWorkers.toString()}
        extraClass="smaller"
      >
        {Array.from(Array(maxCpus).keys()).map((n) => (
          <option key={n + 1}>{n + 1}</option>
        ))}
        <option key={0} value={0}>
          Max
        </option>
      </SelectField>
    </>
  )
}
