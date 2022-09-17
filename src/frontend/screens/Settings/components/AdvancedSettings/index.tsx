import React, { useContext, useEffect, useState } from 'react'
import { IpcRenderer, Clipboard } from 'electron'
import { useTranslation } from 'react-i18next'
import {
  CleaningServicesOutlined,
  ContentCopyOutlined,
  DeleteOutline,
  CachedOutlined,
  UploadOutlined,
  DownloadOutlined,
  CancelOutlined,
  SelectAllOutlined,
  DeselectOutlined
} from '@mui/icons-material'
import classNames from 'classnames'
import AltLegendaryBin from './AltLegendaryBin'
import AltGOGdlBin from './AltGOGdlBin'
import DownloadNoHTTPS from './DownloadNoHTTPS'
import SettingsContext from '../../SettingsContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameStatus } from 'common/types'

interface ElectronProps {
  ipcRenderer: IpcRenderer
  clipboard: Clipboard
}

const { ipcRenderer, clipboard } = window.require('electron') as ElectronProps

export default function AdvancedSettings() {
  const { config } = useContext(SettingsContext)

  const [isCopiedToClipboard, setCopiedToClipboard] = useState(false)

  const [eosOverlayInstalled, setEosOverlayInstalled] = useState(false)
  const [eosOverlayVersion, setEosOverlayVersion] = useState('')
  const [eosOverlayLatestVersion, setEosOverlayLatestVersion] = useState('')
  const [eosOverlayCheckingForUpdates, setEosOverlayCheckingForUpdates] =
    useState(false)
  const [eosOverlayInstallingOrUpdating, setEosOverlayInstallingOrUpdating] =
    useState(false)
  const [eosOverlayEnabledGlobally, setEosOverlayEnabledGlobally] =
    useState(false)
  const eosOverlayAppName = '98bc04bc842e4906993fd6d6644ffb8d'

  const { libraryStatus, handleGameStatus, platform, refreshLibrary } =
    useContext(ContextProvider)
  const { t } = useTranslation()
  const isWindows = platform === 'win32'

  useEffect(() => {
    // set copied to clipboard status to true if it's not already set to true
    // used for changing text and color
    if (!isCopiedToClipboard) return

    const timer = setTimeout(() => {
      setCopiedToClipboard(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isCopiedToClipboard])

  useEffect(() => {
    const getEosStatus = async () => {
      const { isInstalled, version } = await ipcRenderer.invoke(
        'getEosOverlayStatus'
      )
      setEosOverlayInstalled(isInstalled)
      setEosOverlayVersion(version)
    }
    getEosStatus()
  }, [eosOverlayInstalled, eosOverlayVersion])

  useEffect(() => {
    const getLatestEosOverlayVersion = async () => {
      const version = await ipcRenderer.invoke('getLatestEosOverlayVersion')
      setEosOverlayLatestVersion(version)
    }
    getLatestEosOverlayVersion()
  }, [eosOverlayLatestVersion])

  useEffect(() => {
    const { status } =
      libraryStatus.filter(
        (game: GameStatus) => game.appName === eosOverlayAppName
      )[0] || {}
    setEosOverlayInstallingOrUpdating(
      status === 'installing' || status === 'updating'
    )
  }, [eosOverlayInstallingOrUpdating])

  useEffect(() => {
    const enabledGlobally = async () => {
      if (isWindows) {
        setEosOverlayEnabledGlobally(
          await ipcRenderer.invoke('isEosOverlayEnabled')
        )
      }
    }
    enabledGlobally()
  }, [eosOverlayEnabledGlobally])

  function getMainEosText() {
    if (eosOverlayInstalled && eosOverlayInstallingOrUpdating)
      return t(
        'setting.eosOverlay.updating',
        'The EOS Overlay is being updated...'
      )
    if (eosOverlayInstalled && !eosOverlayInstallingOrUpdating)
      return t('setting.eosOverlay.installed', 'The EOS Overlay is installed')
    if (!eosOverlayInstalled && eosOverlayInstallingOrUpdating)
      return t(
        'setting.eosOverlay.installing',
        'The EOS Overlay is being installed...'
      )
    if (!eosOverlayInstalled && !eosOverlayInstallingOrUpdating)
      return t(
        'setting.eosOverlay.notInstalled',
        'The EOS Overlay is not installed'
      )
    return ''
  }

  async function installEosOverlay() {
    await handleGameStatus({
      appName: eosOverlayAppName,
      runner: 'legendary',
      status: 'installing'
    })
    setEosOverlayInstallingOrUpdating(true)
    const installError = await ipcRenderer.invoke('installEosOverlay')
    await handleGameStatus({
      appName: eosOverlayAppName,
      runner: 'legendary',
      status: 'done'
    })
    setEosOverlayInstallingOrUpdating(false)
    setEosOverlayInstalled(!installError)
    // `eos-overlay install` enables the overlay by default on Windows
    setEosOverlayEnabledGlobally(isWindows)
    // Update latest version info
    await checkForEosOverlayUpdates()
  }

  async function removeEosOverlay() {
    const wasRemoved = await ipcRenderer.invoke('removeEosOverlay')
    setEosOverlayInstalled(!wasRemoved)
  }

  async function updateEosOverlay() {
    await handleGameStatus({
      appName: eosOverlayAppName,
      runner: 'legendary',
      status: 'updating'
    })
    setEosOverlayInstallingOrUpdating(true)
    await ipcRenderer.invoke('installEosOverlay')
    await handleGameStatus({
      appName: eosOverlayAppName,
      runner: 'legendary',
      status: 'done'
    })
    setEosOverlayInstallingOrUpdating(false)
    const { version: newVersion } = await ipcRenderer.invoke(
      'getEosOverlayStatus'
    )
    setEosOverlayVersion(newVersion)
  }

  async function cancelEosOverlayInstallOrUpdate() {
    await ipcRenderer.invoke('cancelEosOverlayInstallOrUpdate')
    await handleGameStatus({
      appName: eosOverlayAppName,
      runner: 'legendary',
      status: 'canceled'
    })
    setEosOverlayInstallingOrUpdating(false)
  }

  async function toggleEosOverlay() {
    if (eosOverlayEnabledGlobally) {
      await ipcRenderer.invoke('disableEosOverlay', '')
      setEosOverlayEnabledGlobally(false)
    } else {
      const { wasEnabled } = await ipcRenderer.invoke('enableEosOverlay', '')
      setEosOverlayEnabledGlobally(wasEnabled)
    }
  }

  async function checkForEosOverlayUpdates() {
    setEosOverlayCheckingForUpdates(true)
    await ipcRenderer.invoke('updateEosOverlayInfo')
    const newVersion = await ipcRenderer.invoke('getLatestEosOverlayVersion')
    setEosOverlayLatestVersion(newVersion)
    setEosOverlayCheckingForUpdates(false)
  }

  async function clearHeroicCache() {
    const storage: Storage = window.localStorage
    storage.removeItem('updates')
    ipcRenderer.send('clearCache')
    return refreshLibrary({ fullRefresh: true, runInBackground: true })
  }

  return (
    <div>
      <h3 className="settingSubheader">{t('settings.navbar.advanced')}</h3>

      <AltLegendaryBin />

      <AltGOGdlBin />

      <DownloadNoHTTPS />

      <hr />

      <div className="eosSettings">
        <h3>EOS Overlay</h3>
        <div>{getMainEosText()}</div>
        <br />
        {eosOverlayInstalled && !eosOverlayInstallingOrUpdating && (
          <>
            <div>
              {t(
                'setting.eosOverlay.currentVersion',
                'Current Version: {{version}}',
                { version: eosOverlayVersion }
              )}
            </div>
            <div>
              {t(
                'setting.eosOverlay.latestVersion',
                'Latest Version: {{version}}',
                { version: eosOverlayLatestVersion }
              )}
            </div>
            <br />
          </>
        )}
        <div className="footerFlex">
          {eosOverlayInstalled && (
            <>
              {/* Check for updates */}
              {(eosOverlayVersion === eosOverlayLatestVersion ||
                eosOverlayCheckingForUpdates) && (
                <button
                  className="button is-primary"
                  onClick={checkForEosOverlayUpdates}
                >
                  <CachedOutlined />
                  <span>
                    {eosOverlayCheckingForUpdates
                      ? t(
                          'setting.eosOverlay.checkingForUpdates',
                          'Checking for updates...'
                        )
                      : t(
                          'setting.eosOverlay.checkForUpdates',
                          'Check for updates'
                        )}
                  </span>
                </button>
              )}
              {/* Update */}
              {eosOverlayVersion !== eosOverlayLatestVersion &&
                !eosOverlayCheckingForUpdates && (
                  <button
                    className="button is-primary"
                    onClick={updateEosOverlay}
                  >
                    <UploadOutlined />
                    <span>
                      {eosOverlayInstallingOrUpdating
                        ? t('setting.eosOverlay.updating', 'Updating...')
                        : t('setting.eosOverlay.updateNow', 'Update')}
                    </span>
                  </button>
                )}
              {/* Enable/Disable */}
              {isWindows && (
                <button
                  className={
                    eosOverlayEnabledGlobally
                      ? 'button is-danger'
                      : 'button is-primary'
                  }
                  onClick={toggleEosOverlay}
                >
                  {eosOverlayEnabledGlobally ? (
                    <DeselectOutlined />
                  ) : (
                    <SelectAllOutlined />
                  )}
                  <span>
                    {eosOverlayEnabledGlobally
                      ? t('setting.eosOverlay.disable', 'Disable')
                      : t('setting.eosOverlay.enable', 'Enable')}
                  </span>
                </button>
              )}
              {/* Remove */}
              {!eosOverlayInstallingOrUpdating && (
                <button className="button is-danger" onClick={removeEosOverlay}>
                  <DeleteOutline />
                  <span>{t('setting.eosOverlay.remove', 'Uninstall')}</span>
                </button>
              )}
            </>
          )}
          {/* Install */}
          {!eosOverlayInstalled && !eosOverlayInstallingOrUpdating && (
            <button className="button is-primary" onClick={installEosOverlay}>
              <DownloadOutlined />
              <span>{t('setting.eosOverlay.install', 'Install')}</span>
            </button>
          )}
          {/* Cancel install/update */}
          {eosOverlayInstallingOrUpdating && (
            <button
              className="button is-danger"
              onClick={cancelEosOverlayInstallOrUpdate}
            >
              <CancelOutlined />
              <span>{t('setting.eosOverlay.cancelInstall', 'Cancel')}</span>
            </button>
          )}
        </div>
        <br />
        <hr />
      </div>
      <div className="footerFlex">
        <button
          className={classNames('button', 'is-footer', {
            isSuccess: isCopiedToClipboard
          })}
          onClick={() => {
            clipboard.writeText(JSON.stringify({ ...config }, null, 2))
            setCopiedToClipboard(true)
          }}
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <ContentCopyOutlined />
            </div>
            <span className="button-icon-text">
              {isCopiedToClipboard
                ? t('settings.copiedToClipboard', 'Copied to Clipboard!')
                : t(
                    'settings.copyToClipboard',
                    'Copy All Settings to Clipboard'
                  )}
            </span>
          </div>
        </button>
        <button
          className="button is-footer is-danger"
          onClick={async () => clearHeroicCache()}
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <CleaningServicesOutlined />
            </div>
            <span className="button-icon-text">
              {t('settings.clear-cache', 'Clear Heroic Cache')}
            </span>
          </div>
        </button>

        <button
          className="button is-footer is-danger"
          onClick={() => ipcRenderer.send('resetHeroic')}
        >
          <div className="button-icontext-flex">
            <div className="button-icon-flex">
              <DeleteOutline />
            </div>
            <span className="button-icon-text">
              {t('settings.reset-heroic', 'Reset Heroic')}
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
