import { create } from 'zustand'
import type { GameConfig, GlobalConfig } from 'backend/config/schemas'
import type { Runner } from 'common/types'

const useGlobalConfigState = create<GlobalConfig | null>(() => null)
const useGameConfigState = create<Record<`${string}_${Runner}`, GameConfig>>(
  () => ({})
)

window.api.config.messages.globalConfigChanged((key, value) =>
  useGlobalConfigState.setState((config) => ({
    [key]: value
  }))
)
window.api.config.messages.gameConfigChanged((appName, runner, key, value) =>
  useGameConfigState.setState((all_configs) => ({
    [`${appName}_${runner}`]: {
      ...all_configs[`${appName}_${runner}`],
      [key]: value
    }
  }))
)

export { useGlobalConfigState, useGameConfigState }
