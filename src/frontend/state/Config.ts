import { create } from 'zustand'
import type { GameConfig, GlobalConfig } from 'backend/config/schemas'
import type { Runner } from 'common/types'

const useGlobalConfigState = create<GlobalConfig | null>(() => null)
const useGameConfigState = create<Record<`${string}_${Runner}`, GameConfig>>(
  () => ({})
)

const useUserConfiguredGlobalConfigKeys = create<Record<
  keyof GlobalConfig,
  boolean
> | null>(() => null)
const useUserConfiguredGameConfigKeys = create<
  Record<`${string}_${Runner}`, Record<keyof GameConfig, boolean>>
>(() => ({}))

window.api.config.messages.globalConfigChanged((key, value) => {
  useGlobalConfigState.setState({
    [key]: value
  })
  useUserConfiguredGlobalConfigKeys.setState({
    [key]: true
  })
})
window.api.config.messages.globalConfigKeyReset((key, defaultValue) => {
  useGlobalConfigState.setState({
    [key]: defaultValue
  })
  useUserConfiguredGlobalConfigKeys.setState({
    [key]: false
  })
})

window.api.config.messages.gameConfigChanged((appName, runner, key, value) => {
  useGameConfigState.setState((all_configs) => ({
    [`${appName}_${runner}`]: {
      ...all_configs[`${appName}_${runner}`],
      [key]: value
    }
  }))
  useUserConfiguredGameConfigKeys.setState((all_keys) => ({
    [`${appName}_${runner}`]: {
      ...all_keys[`${appName}_${runner}`],
      [key]: true
    }
  }))
})
window.api.config.messages.gameConfigKeyReset(
  (appName, runner, key, defaultValue) => {
    useGameConfigState.setState((all_configs) => ({
      [`${appName}_${runner}`]: {
        ...all_configs[`${appName}_${runner}`],
        [key]: defaultValue
      }
    }))
    useUserConfiguredGameConfigKeys.setState((all_configs) => ({
      [`${appName}_${runner}`]: {
        ...all_configs[`${appName}_${runner}`],
        [key]: false
      }
    }))
  }
)
window.api.config.messages.gameConfigCleared((appName, runner) => {
  const old_configs = useGameConfigState.getState()
  delete old_configs[`${appName}_${runner}`]
  useGameConfigState.setState(old_configs, true)

  const old_keys = useUserConfiguredGameConfigKeys.getState()
  delete old_keys[`${appName}_${runner}`]
  useUserConfiguredGameConfigKeys.setState(old_keys, true)
})

export {
  useGlobalConfigState,
  useGameConfigState,
  useUserConfiguredGlobalConfigKeys,
  useUserConfiguredGameConfigKeys
}
