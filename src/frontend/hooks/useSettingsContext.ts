import { AppSettings, GameInfo, Runner } from 'common/types'
import { SettingsContextType } from 'frontend/types'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'

type Props = {
  appName: string
  gameInfo: GameInfo
  runner: Runner
}

const useSettingsContext = ({ appName, gameInfo, runner }: Props) => {
  const [currentConfig, setCurrentConfig] = useState<Partial<AppSettings>>({})
  const { i18n } = useTranslation()
  const { platform } = useContext(ContextProvider)

  const isDefault = appName === 'default'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isMacNative = isMac && (gameInfo?.is_mac_native || false)
  const isLinuxNative = isLinux && (gameInfo?.is_linux_native || false)

  // Load Heroic's or game's config, only if not loaded already
  useEffect(() => {
    const getSettings = async () => {
      const config = isDefault
        ? await window.api.requestAppSettings()
        : await window.api.requestGameSettings(appName)
      setCurrentConfig(config)
    }
    getSettings()
  }, [appName, isDefault, i18n.language])

  const contextValues: SettingsContextType = {
    getSetting: (key, fallback) => currentConfig[key] ?? fallback,
    setSetting: (key, value) => {
      const currentValue = currentConfig[key]
      if (currentValue !== undefined || currentValue !== null) {
        const noChange = JSON.stringify(value) === JSON.stringify(currentValue)
        if (noChange) return
      }
      setCurrentConfig({ ...currentConfig, [key]: value })
      window.api.setSetting({ appName, key, value })
    },
    config: currentConfig,
    isDefault,
    appName,
    runner,
    gameInfo,
    isLinuxNative,
    isMacNative
  }

  if (Object.keys(contextValues.config).length === 0) {
    return null
  }

  return contextValues
}

export default useSettingsContext
