import { useEffect, useState } from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'

/**
 * Aurelia setting: download a Steam game's other version when it is picked,
 * or only on the next launch.
 */
const SteamPlatformSwitchInstall = () => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'play' | 'switch'>()

  useEffect(() => {
    void window.api.getSteamPlatformSwitchInstall().then(setMode)
  }, [])

  // Not on Linux, or an Aurelia without the setting
  if (!mode) {
    return <></>
  }

  const toggle = async () => {
    const next = mode === 'switch' ? 'play' : 'switch'
    setMode(next)
    try {
      setMode((await window.api.setSteamPlatformSwitchInstall(next)) ?? next)
    } catch {
      setMode(mode)
    }
  }

  return (
    <ToggleSwitch
      description={t(
        'setting.steamPlatformSwitchInstall-description',
        'Start the download when you pick the Linux or Windows version of a Steam game, instead of on its next launch'
      )}
      htmlId="steamPlatformSwitchInstall"
      value={mode === 'switch'}
      handleChange={() => void toggle()}
      title={t(
        'setting.steamPlatformSwitchInstall',
        'Download Steam game versions when switching'
      )}
    />
  )
}

export default SteamPlatformSwitchInstall
