import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import { Warning } from '@mui/icons-material'
import DownIcon from 'frontend/assets/down-icon.svg?react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { SelectField } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'
import type { SteamLaunchTarget as Target } from 'common/types/steam'
import type { SteamLaunchTargetsState } from 'frontend/hooks/useSteamLaunchTargets'
import './SteamLaunchTarget.css'

// MUI hides empty-string values
const AUTOMATIC = 'automatic'

interface Props {
  // From useSteamLaunchTargets
  state: SteamLaunchTargetsState
}

const SteamLaunchTarget = ({ state }: Props) => {
  const { t } = useTranslation()
  const { game, gameInfo } = useContext(SettingsContext)
  const { targets, selected, select, refresh } = state

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const installPath = gameInfo?.install?.install_path

  // Nothing to choose between
  if (!game || !gameInfo || targets.length < 2) {
    return <></>
  }

  const modeLabel = (target: Target) => {
    switch (target.steamMode) {
      case 'runtime':
        return t('setting.steamLaunchTarget.runtime', 'In-Wine Steam runtime')
      case 'host':
        return t('setting.steamLaunchTarget.host', 'Host Steam')
      case 'none':
        return t('setting.steamLaunchTarget.none', 'No Steam')
      default:
        return t('setting.steamLaunchTarget.native', 'Native')
    }
  }

  const labelFor = (target: Target) => {
    const isLinuxBuild = target.platform === 'linux'
    const platformName = isLinuxBuild ? 'Linux' : 'Windows'
    return (
      <span className="steamLaunchTarget__label">
        <FontAwesomeIcon
          icon={isLinuxBuild ? faLinux : faWindows}
          title={platformName}
          aria-label={platformName}
        />
        {modeLabel(target)}
      </span>
    )
  }

  const missingLabel = (target: Target) => {
    switch (target.missing) {
      case 'build':
        return t('setting.steamLaunchTarget.missingBuild', 'not downloaded')
      case 'steam-runtime':
        return t(
          'setting.steamLaunchTarget.missingRuntime',
          'Steam runtime not installed'
        )
      case 'host-steam':
        return t(
          'setting.steamLaunchTarget.missingHost',
          'Steam not installed on this system'
        )
      default:
        return ''
    }
  }

  const fallback = targets.find((target) => target.isDefault)
  const current = targets.find((target) => target.id === selected)

  const handleChange = async (event: SelectChangeEvent) => {
    const value = event.target.value === AUTOMATIC ? '' : event.target.value
    setError('')
    await select(value)
  }

  const download = async () => {
    if (!current) return
    setError('')
    if (current.missing === 'build' && installPath) {
      // Queued like any other download
      await window.api.install({
        appName: game.id,
        runner: 'steam',
        path: installPath,
        platformToInstall: current.platform === 'linux' ? 'linux' : 'Windows',
        gameInfo,
        installDlcs: [],
        sdlList: [],
        installLanguage: 'en-US'
      })
      return
    }
    if (current.missing === 'steam-runtime') {
      setBusy(true)
      const result = await window.api.installSteamWineRuntime()
      setBusy(false)
      if (result.status === 'error') {
        setError(result.error ?? '')
      }
      await refresh()
    }
  }

  const canDownload =
    current?.missing === 'build' || current?.missing === 'steam-runtime'

  return (
    <SelectField
      htmlId="steamLaunchTarget"
      label={t('setting.steamLaunchTarget.title', 'Game version to launch')}
      value={selected || AUTOMATIC}
      onChange={handleChange}
      afterSelect={
        <>
          {canDownload && (
            <button
              className="button is-primary"
              disabled={busy}
              onClick={download}
            >
              {current?.missing === 'build'
                ? t('setting.steamLaunchTarget.downloadBuild', 'Download')
                : t(
                    'setting.steamLaunchTarget.installRuntime',
                    'Install Steam runtime'
                  )}
            </button>
          )}
          {current && !current.available && fallback && (
            <span className="smallInputInfo steamLaunchTarget__label">
              {t('setting.steamLaunchTarget.fallback', 'Until then, Play uses')}
              {labelFor(fallback)}
            </span>
          )}
          {error && <span className="smallInputInfo danger">{error}</span>}
        </>
      }
    >
      <MenuItem value={AUTOMATIC}>
        <span className="steamLaunchTarget__label">
          {t('setting.steamLaunchTarget.automatic', 'Automatic')}
          {fallback && <>({labelFor(fallback)})</>}
        </span>
      </MenuItem>
      {targets.map((target) => (
        <MenuItem key={target.id} value={target.id}>
          <span className="steamLaunchTarget__option">
            {labelFor(target)}
            {target.missing && (
              <span
                className="steamLaunchTarget__missing"
                title={missingLabel(target)}
                aria-label={missingLabel(target)}
              >
                {target.missing === 'host-steam' ? <Warning /> : <DownIcon />}
              </span>
            )}
          </span>
        </MenuItem>
      ))}
    </SelectField>
  )
}

export default SteamLaunchTarget
