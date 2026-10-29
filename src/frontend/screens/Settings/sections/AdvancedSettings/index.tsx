import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameStatus } from 'common/types'
import {
  AllowInstallationBrokenAnticheat,
  ShowValveProton,
  AltGOGdlBin,
  AltLegendaryBin,
  AltNileBin,
  ClearCache,
  CustomCSS,
  DisableLogs,
  DownloadNoHTTPS,
  ExperimentalFeatures,
  HideWindowOnProtocolLaunch,
  ResetHeroic,
  GamePadDelayRepeat,
  SteamGridDbApiKey
} from '../../components'
import DisableGOGPresence from '../../components/DisableGOGPresence'
import { Button, Icon, SettingRow, SettingsCard } from 'frontend/components/UI'
import {
  Binary,
  Bug,
  Code2,
  Gamepad2,
  Layers,
  RefreshCw,
  ShieldAlert,
  SquareCheck,
  SquareDashed,
  Terminal,
  Trash2,
  Upload,
  X,
  Download as DownloadIcon
} from 'lucide-react'

export default function AdvancedSetting() {
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

  const { libraryStatus, platform } = useContext(ContextProvider)
  const { t } = useTranslation()
  const isWindows = platform === 'win32'
  const isLinux = platform === 'linux'

  useEffect(() => {
    const getEosStatus = async () => {
      const { isInstalled, version } = await window.api.getEosOverlayStatus()
      setEosOverlayInstalled(isInstalled)
      setEosOverlayVersion(version ?? '')
    }
    getEosStatus()
  }, [])

  useEffect(() => {
    const getLatestEosOverlayVersion = async () => {
      const version = await window.api.getLatestEosOverlayVersion()
      setEosOverlayLatestVersion(version)
    }
    getLatestEosOverlayVersion()
  }, [])

  useEffect(() => {
    const { status } =
      libraryStatus.filter(
        (game: GameStatus) => game.appName === eosOverlayAppName
      )[0] || {}
    setEosOverlayInstallingOrUpdating(
      status === 'installing' || status === 'updating'
    )
  }, [])

  useEffect(() => {
    const enabledGlobally = async () => {
      if (isWindows) {
        setEosOverlayEnabledGlobally(await window.api.isEosOverlayEnabled())
      }
    }
    enabledGlobally()
  }, [])

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
    setEosOverlayInstallingOrUpdating(true)
    const installError = await window.api.installEosOverlay()
    setEosOverlayInstallingOrUpdating(false)
    setEosOverlayInstalled(!installError)
    // `eos-overlay install` enables the overlay by default on Windows
    setEosOverlayEnabledGlobally(isWindows)
    // Update latest version info
    await checkForEosOverlayUpdates()
  }

  async function removeEosOverlay() {
    const wasRemoved = await window.api.removeEosOverlay()
    setEosOverlayInstalled(!wasRemoved)
  }

  async function updateEosOverlay() {
    setEosOverlayInstallingOrUpdating(true)
    await window.api.installEosOverlay()
    setEosOverlayInstallingOrUpdating(false)
    const { version: newVersion } = await window.api.getEosOverlayStatus()
    setEosOverlayVersion(newVersion ?? '')
  }

  async function cancelEosOverlayInstallOrUpdate() {
    window.api.abort(eosOverlayAppName)
    setEosOverlayInstallingOrUpdating(false)
  }

  async function toggleEosOverlay() {
    if (eosOverlayEnabledGlobally) {
      await window.api.disableEosOverlay('')
      setEosOverlayEnabledGlobally(false)
    } else {
      const { wasEnabled } = await window.api.enableEosOverlay('')
      setEosOverlayEnabledGlobally(wasEnabled)
    }
  }

  async function checkForEosOverlayUpdates() {
    setEosOverlayCheckingForUpdates(true)
    await window.api.updateEosOverlayInfo()
    const newVersion = await window.api.getLatestEosOverlayVersion()
    setEosOverlayLatestVersion(newVersion)
    setEosOverlayCheckingForUpdates(false)
  }

  return (
    <div className="settingsSections">
      <SettingsCard
        glyph={Code2}
        title={t('settings.section.integrations', 'Integrations')}
      >
        <SteamGridDbApiKey />
      </SettingsCard>

      <SettingsCard
        glyph={Binary}
        title={t('settings.section.binaries', 'Alternative Binaries')}
      >
        <AltLegendaryBin />
        <AltGOGdlBin />
        <AltNileBin />
      </SettingsCard>

      <SettingsCard
        glyph={ShieldAlert}
        title={t('settings.section.behaviour', 'Behaviour')}
      >
        <DownloadNoHTTPS />
        <DisableLogs />
        <DisableGOGPresence />
        <AllowInstallationBrokenAnticheat />
        <HideWindowOnProtocolLaunch />
        {isLinux && <ShowValveProton />}
      </SettingsCard>

      <SettingsCard
        glyph={Gamepad2}
        title={t('settings.section.controller', 'Controller')}
      >
        <GamePadDelayRepeat />
      </SettingsCard>

      <SettingsCard
        glyph={Layers}
        title="EOS Overlay"
        description={t(
          'setting.eosOverlay.description',
          'Epic\u2019s in-game overlay, required by some Epic titles for friends and achievements'
        )}
      >
        <SettingRow
          label={getMainEosText()}
          description={
            eosOverlayInstalled && !eosOverlayInstallingOrUpdating
              ? `${t(
                  'setting.eosOverlay.currentVersion',
                  'Current Version: {{version}}',
                  { version: eosOverlayVersion }
                )} · ${t(
                  'setting.eosOverlay.latestVersion',
                  'Latest Version: {{version}}',
                  { version: eosOverlayLatestVersion }
                )}`
              : undefined
          }
        >
          {eosOverlayInstalled && (
            <>
              {(eosOverlayVersion === eosOverlayLatestVersion ||
                eosOverlayCheckingForUpdates) && (
                <Button
                  variant="primary"
                  icon={<Icon glyph={RefreshCw} size="md" />}
                  onClick={checkForEosOverlayUpdates}
                >
                  {eosOverlayCheckingForUpdates
                    ? t(
                        'setting.eosOverlay.checkingForUpdates',
                        'Checking for updates...'
                      )
                    : t(
                        'setting.eosOverlay.checkForUpdates',
                        'Check for updates'
                      )}
                </Button>
              )}
              {eosOverlayVersion !== eosOverlayLatestVersion &&
                !eosOverlayCheckingForUpdates && (
                  <Button
                    variant="primary"
                    icon={<Icon glyph={Upload} size="md" />}
                    onClick={updateEosOverlay}
                  >
                    {eosOverlayInstallingOrUpdating
                      ? t('setting.eosOverlay.updating', 'Updating...')
                      : t('setting.eosOverlay.updateNow', 'Update')}
                  </Button>
                )}
              {isWindows && (
                <Button
                  variant={eosOverlayEnabledGlobally ? 'dangerSubtle' : 'ghost'}
                  icon={
                    <Icon
                      glyph={
                        eosOverlayEnabledGlobally ? SquareDashed : SquareCheck
                      }
                      size="md"
                    />
                  }
                  onClick={toggleEosOverlay}
                >
                  {eosOverlayEnabledGlobally
                    ? t('setting.eosOverlay.disable', 'Disable')
                    : t('setting.eosOverlay.enable', 'Enable')}
                </Button>
              )}
              {!eosOverlayInstallingOrUpdating && (
                <Button
                  variant="dangerSubtle"
                  icon={<Icon glyph={Trash2} size="md" />}
                  onClick={removeEosOverlay}
                >
                  {t('setting.eosOverlay.remove', 'Uninstall')}
                </Button>
              )}
            </>
          )}
          {!eosOverlayInstalled && !eosOverlayInstallingOrUpdating && (
            <Button
              variant="primary"
              icon={<Icon glyph={DownloadIcon} size="md" />}
              onClick={installEosOverlay}
            >
              {t('setting.eosOverlay.install', 'Install')}
            </Button>
          )}
          {eosOverlayInstallingOrUpdating && (
            <Button
              variant="dangerSubtle"
              icon={<Icon glyph={X} size="md" />}
              onClick={cancelEosOverlayInstallOrUpdate}
            >
              {t('setting.eosOverlay.cancelInstall', 'Cancel')}
            </Button>
          )}
        </SettingRow>
      </SettingsCard>

      <SettingsCard
        glyph={Bug}
        title={t('settings.section.experimental', 'Experimental Features')}
      >
        <ExperimentalFeatures />
      </SettingsCard>

      <SettingsCard
        glyph={Terminal}
        title={t('settings.section.maintenance', 'Customisation & Maintenance')}
      >
        <CustomCSS />
        <ClearCache />
        <ResetHeroic />
      </SettingsCard>
    </div>
  )
}
