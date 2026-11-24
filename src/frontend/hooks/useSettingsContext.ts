import { AppSettings, GameInfo, Runner } from 'common/types'
import { SettingsContextType } from 'frontend/types'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useContext, useRef } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'

import useGlobalState from 'frontend/state/GlobalStateV2'

type Props = {
  appName: string
  gameInfo?: GameInfo
  runner?: Runner
}

const useSettingsContext = ({ appName, gameInfo, runner }: Props) => {
  const [currentConfig, setCurrentConfig] = useState<Partial<AppSettings>>({})
  const currentConfigRef = useRef(currentConfig)
  const { i18n } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { settingsModalProps } = useGlobalState.keys('settingsModalProps')

  const isDefault = appName === 'default'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isMacNative =
    isMac &&
    (['Mac', 'osx'].includes(gameInfo?.install.platform ?? '') || false)
  const isLinuxNative =
    isLinux && (gameInfo?.install.platform === 'linux' || false)

  // Load Heroic's or game's config, only if not loaded already
  useEffect(() => {
    const getSettings = async () => {
      const config = isDefault
        ? await window.api.requestAppSettings()
        : await window.api.requestGameSettings(appName)
      currentConfigRef.current = config
      setCurrentConfig(config)
    }
    void getSettings()
  }, [appName, isDefault, i18n.language, settingsModalProps.isOpen])

  const contextValues: SettingsContextType = {
    getSetting: (key, fallback) => currentConfig[key] ?? fallback,
    setSetting: (key, value) => {
      const currentValue = currentConfigRef.current[key]
      if (JSON.stringify(value) === JSON.stringify(currentValue)) {
        return
      }
      const next = { ...currentConfigRef.current, [key]: value }
      currentConfigRef.current = next
      setCurrentConfig(next)
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
