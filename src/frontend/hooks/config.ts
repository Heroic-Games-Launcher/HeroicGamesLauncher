import { useContext, useEffect } from 'react'
import SettingsContext from '../screens/Settings/SettingsContext'
import GameContext from '../screens/Game/GameContext'
import { useShallow } from 'zustand/react/shallow'
import type { GlobalConfig, GameConfig } from 'backend/config/schemas'
import type { Runner } from 'common/types'
import { useGameConfigState, useGlobalConfigState } from '../state/Config'

type ConfigReturn<
  ConfigT extends GlobalConfig | GameConfig,
  KeyT extends keyof ConfigT
> =
  | [
      value: undefined,
      set: (value: ConfigT[KeyT]) => Promise<void>,
      fetched: false
    ]
  | [
      value: ConfigT[KeyT],
      set: (value: ConfigT[KeyT]) => Promise<void>,
      fetched: true
    ]

// Use either useGlobalConfig or useGameConfig, depending on the context
const useSharedConfig = <KeyT extends keyof GlobalConfig & keyof GameConfig>(
  key: KeyT
) => {
  const { isDefault, appName, runner } = useContext(SettingsContext)
  if (isDefault) return useGlobalConfig(key)
  return useGameConfig(key, appName, runner)
}

const useGlobalConfig = <KeyT extends keyof GlobalConfig>(
  key: KeyT
): ConfigReturn<GlobalConfig, KeyT> => {
  const configFetched = useGlobalConfigState(useShallow((config) => !!config))
  const configValue = useGlobalConfigState(
    useShallow((config) => config?.[key])
  )

  useEffect(() => {
    if (!configFetched)
      window.api.config.global.get().then(useGlobalConfigState.setState)
  }, [])

  async function setter(value: GlobalConfig[KeyT]) {
    return window.api.config.global.set(key, value)
  }

  if (!configFetched) return [undefined, setter, false]
  return [configValue!, setter, true]
}

// This overload automatically fetches AppName and key from either SettingsContext or GameContext
function useGameConfig<KeyT extends keyof GameConfig>(
  key: KeyT
): ConfigReturn<GameConfig, KeyT>
function useGameConfig<KeyT extends keyof GameConfig>(
  key: KeyT,
  appName: string,
  runner: Runner
): ConfigReturn<GameConfig, KeyT>
function useGameConfig<KeyT extends keyof GameConfig>(
  key: KeyT,
  maybeAppName?: string,
  maybeRunner?: Runner
): ConfigReturn<GameConfig, KeyT> {
  const { isDefault } = useContext(SettingsContext)

  const appName =
    maybeAppName ?? isDefault
      ? useContext(GameContext).appName
      : useContext(SettingsContext).appName
  const runner =
    maybeRunner ?? isDefault
      ? useContext(GameContext).runner
      : useContext(SettingsContext).runner

  if (appName === 'default')
    throw new Error(
      'useGameConfig called with appName=default. Are you inside a Game-/SettingsContext?'
    )

  const configFetched = useGameConfigState(
    useShallow((config) => !!config[`${appName}_${runner}`])
  )
  const configValue = useGameConfigState(
    useShallow((config) => config[`${appName}_${runner}`]?.[key])
  )

  useEffect(() => {
    if (!configFetched)
      window.api.config.game.get(appName, runner).then((config) => {
        useGameConfigState.setState({
          [`${appName}_${runner}`]: config
        })
      })
  }, [])

  async function setter(value: GameConfig[KeyT]) {
    return window.api.config.game.set(appName, runner, key, value)
  }

  if (!configFetched) return [undefined, setter, false]
  return [configValue!, setter, true]
}

export { useSharedConfig, useGlobalConfig, useGameConfig }
