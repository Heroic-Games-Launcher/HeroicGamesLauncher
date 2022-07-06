import {
  Backspace,
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
import { IpcRenderer, Clipboard } from 'electron'
import { useTranslation } from 'react-i18next'
import React, { useContext, useEffect, useState } from 'react'
import ContextProvider from 'src/state/ContextProvider'
import { AppSettings, GameStatus, Path } from 'src/types'
import { configStore } from 'src/helpers/electronStores'
import TextInputWithIconField from 'src/components/UI/TextInputWithIconField'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'

interface ElectronProps {
  ipcRenderer: IpcRenderer
  clipboard: Clipboard
}

const { ipcRenderer, clipboard } = window.require('electron') as ElectronProps

interface Props {
  altLegendaryBin: string
  altGogdlBin: string
  setAltLegendaryBin: (value: string) => void
  setAltGogdlBin: (value: string) => void
  settingsToSave: AppSettings
}

export const AdvancedSettings = ({
  altLegendaryBin,
  altGogdlBin,
  setAltLegendaryBin,
  setAltGogdlBin,
  settingsToSave
}: Props) => {
  const [legendaryVersion, setLegendaryVersion] = useState('')
  const [gogdlVersion, setGogdlVersion] = useState('')
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

  const { libraryStatus, handleGameStatus, platform } =
    useContext(ContextProvider)
  const { t } = useTranslation()
  const isWindows = platform === 'win32'

  const settings = configStore.get('settings') as {
    altLeg: string
    altGogdl: string
  }

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
    const getMoreInfo = async () => {
      configStore.set('settings', {
        ...settings,
        altLeg: altLegendaryBin
      })

      const legendaryVer = await ipcRenderer.invoke('getLegendaryVersion')
      if (legendaryVer === 'invalid') {
        setLegendaryVersion('Invalid')
        setTimeout(() => {
          setAltLegendaryBin('')
          return setLegendaryVersion('')
        }, 3000)
      }
      return setLegendaryVersion(legendaryVer)
    }
    getMoreInfo()
  }, [altLegendaryBin])

  useEffect(() => {
    const getGogdlVersion = async () => {
      configStore.set('settings', {
        ...settings,
        altGogdl: altGogdlBin
      })
      const gogdlVersion = await ipcRenderer.invoke('getGogdlVersion')
      if (gogdlVersion === 'invalid') {
        setGogdlVersion('Invalid')
        setTimeout(() => {
          setAltGogdlBin('')
          return setGogdlVersion('')
        }, 3000)
      }
      return setGogdlVersion(gogdlVersion)
    }

    getGogdlVersion()
  }, [altGogdlBin])

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
          await ipcRenderer.invoke('isEosOverlayEnabled', '')
        )
      }
    }
    enabledGlobally()
  }, [eosOverlayEnabledGlobally])

  async function handleLegendaryBinary() {
    return ipcRenderer
      .invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t(
          'box.choose-legendary-binary',
          'Select Legendary Binary (needs restart)'
        )
      })
      .then(({ path }: Path) => setAltLegendaryBin(path ? path : ''))
  }

  async function handleGogdlBinary() {
    return ipcRenderer
      .invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t(
          'box.choose-gogdl-binary',
          'Select GOGDL Binary (needs restart)'
        )
      })
      .then(({ path }: Path) => setAltGogdlBin(path ? path : ''))
  }

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

  return (
    <div>
      <h3 className="settingSubheader">{t('settings.navbar.advanced')}</h3>

      <TextInputWithIconField
        htmlId="setting-alt-legendary"
        label={t(
          'setting.alt-legendary-bin',
          'Choose an Alternative Legendary Binary  (needs restart)to use'
        )}
        placeholder={t(
          'placeholder.alt-legendary-bin',
          'Using built-in Legendary binary...'
        )}
        value={altLegendaryBin.replaceAll("'", '')}
        onChange={(event) => setAltLegendaryBin(event.target.value)}
        icon={
          !altLegendaryBin.length ? (
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="setLegendaryBinaryButton"
              style={{
                color: altLegendaryBin.length ? 'transparent' : 'currentColor'
              }}
            />
          ) : (
            <Backspace
              data-testid="setLegendaryBinaryBackspace"
              style={{ color: 'currentColor' }}
            />
          )
        }
        onIconClick={
          !altLegendaryBin.length
            ? async () => handleLegendaryBinary()
            : () => setAltLegendaryBin('')
        }
        afterInput={
          <span className="smallMessage">
            {t('other.legendary-version', 'Legendary Version: ')}
            {legendaryVersion}
          </span>
        }
      />

      <TextInputWithIconField
        label={t(
          'setting.alt-gogdl-bin',
          'Choose an Alternative GOGDL Binary to use (needs restart)'
        )}
        htmlId="setting-alt-gogdl"
        placeholder={t(
          'placeholder.alt-gogdl-bin',
          'Using built-in GOGDL binary...'
        )}
        value={altGogdlBin.replaceAll("'", '')}
        onChange={(event) => setAltGogdlBin(event.target.value)}
        icon={
          !altGogdlBin.length ? (
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="setGogdlBinaryButton"
              style={{
                color: altGogdlBin.length ? 'transparent' : 'currentColor'
              }}
            />
          ) : (
            <Backspace
              data-testid="setGogdlBinaryBackspace"
              style={{ color: '#currentColor' }}
            />
          )
        }
        onIconClick={
          !altGogdlBin.length
            ? async () => handleGogdlBinary()
            : () => setAltGogdlBin('')
        }
        afterInput={
          <span className="smallMessage">
            {t('other.gogdl-version', 'GOGDL Version: ')}
            {gogdlVersion}
          </span>
        }
      />

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
              {eosOverlayVersion === eosOverlayLatestVersion && (
                <button
                  className="button is-primary"
                  onClick={async () => {
                    setEosOverlayCheckingForUpdates(true)
                    await ipcRenderer.invoke('updateEosOverlayInfo')
                    const newVersion = await ipcRenderer.invoke(
                      'getLatestEosOverlayVersion'
                    )
                    setEosOverlayLatestVersion(newVersion)
                    setEosOverlayCheckingForUpdates(false)
                  }}
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
              {eosOverlayVersion !== eosOverlayLatestVersion && (
                <button
                  className="button is-primary"
                  onClick={async () => {
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
                  }}
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
                  onClick={async () => {
                    if (eosOverlayEnabledGlobally) {
                      await ipcRenderer.invoke('disableEosOverlay', '')
                      setEosOverlayEnabledGlobally(false)
                    } else {
                      const { wasEnabled } = await ipcRenderer.invoke(
                        'enableEosOverlay',
                        ''
                      )
                      setEosOverlayEnabledGlobally(wasEnabled)
                    }
                  }}
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
                <button
                  className="button is-danger"
                  onClick={async () => {
                    const wasRemoved = await ipcRenderer.invoke(
                      'removeEosOverlay'
                    )
                    setEosOverlayInstalled(!wasRemoved)
                  }}
                >
                  <DeleteOutline />
                  <span>{t('setting.eosOverlay.remove', 'Uninstall')}</span>
                </button>
              )}
            </>
          )}
          {/* Install */}
          {!eosOverlayInstalled && !eosOverlayInstallingOrUpdating && (
            <button
              className="button is-primary"
              onClick={async () => {
                await handleGameStatus({
                  appName: eosOverlayAppName,
                  runner: 'legendary',
                  status: 'installing'
                })
                setEosOverlayInstallingOrUpdating(true)
                const installError = await ipcRenderer.invoke(
                  'installEosOverlay'
                )
                await handleGameStatus({
                  appName: eosOverlayAppName,
                  runner: 'legendary',
                  status: 'done'
                })
                setEosOverlayInstallingOrUpdating(false)
                setEosOverlayInstalled(!installError)
              }}
            >
              <DownloadOutlined />
              <span>{t('setting.eosOverlay.install', 'Install')}</span>
            </button>
          )}
          {/* Cancel install/update */}
          {eosOverlayInstallingOrUpdating && (
            <button
              className="button is-danger"
              onClick={async () => {
                await ipcRenderer.invoke('cancelEosOverlayInstallOrUpdate')
                await handleGameStatus({
                  appName: eosOverlayAppName,
                  runner: 'legendary',
                  status: 'canceled'
                })
                setEosOverlayInstallingOrUpdating(false)
              }}
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
            clipboard.writeText(JSON.stringify({ ...settingsToSave }, null, 2))
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
          onClick={() => ipcRenderer.send('clearCache')}
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
