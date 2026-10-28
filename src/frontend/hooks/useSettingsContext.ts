import { AppSettings, GameInfo } from 'common/types'
import { SettingsContextType } from 'frontend/types'
import { useState, useEffect, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameHandle } from '../helpers/ipc'

const useSettingsContext = (
  game: GameHandle | null
): SettingsContextType | null => {
  const [currentConfig, setCurrentConfig] = useState<Partial<AppSettings>>({})
  const { platform } = useContext(ContextProvider)
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)

  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isMacNative =
    isMac &&
    (['Mac', 'osx'].includes(gameInfo?.install.platform ?? '') || false)
  const isLinuxNative =
    isLinux && (gameInfo?.install.platform === 'linux' || false)

  useEffect(() => {
    if (game) void window.api.getGameInfo(game).then(setGameInfo)
  }, [game])

  // Load Heroic's or game's config, only if not loaded already
  useEffect(() => {
    const getSettings = async () => {
      const config = game
        ? await window.api.requestGameSettings(game)
        : await window.api.requestAppSettings()
      setCurrentConfig(config)
    }
    void getSettings()
  }, [game])

  const nonDefaultValues:
    | { game: GameHandle; isDefault: false }
    | { game: null; isDefault: true } = game
    ? { game, isDefault: false }
    : { game, isDefault: true }

  const contextValues: SettingsContextType = {
    getSetting: (key, fallback) => currentConfig[key] ?? fallback,
    setSetting: (key, value) => {
      const currentValue = currentConfig[key]
      if (currentValue !== undefined || currentValue !== null) {
        const noChange = JSON.stringify(value) === JSON.stringify(currentValue)
        if (noChange) return
      }
      setCurrentConfig({ ...currentConfig, [key]: value })
      window.api.setSetting(game, key, value)
    },
    config: currentConfig,
    ...nonDefaultValues,
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
