import { useCallback, useContext, useEffect } from 'react'
import SettingsContext from '../screens/Settings/SettingsContext'
import GameContext from '../screens/Game/GameContext'
import { useShallow } from 'zustand/react/shallow'
import type { GlobalConfig, GameConfig } from 'backend/config/schemas'
import type { Runner } from 'common/types'
import {
  useGameConfigState,
  useGlobalConfigState,
  useUserConfiguredGameConfigKeys,
  useUserConfiguredGlobalConfigKeys
} from '../state/Config'

type ConfigReturn<
  ConfigT extends GlobalConfig | GameConfig,
  KeyT extends keyof ConfigT
> =
  | [
      value: undefined,
      set: (value: ConfigT[KeyT]) => Promise<void>,
      fetched: false,
      isDefault: undefined,
      reset: () => Promise<void>
    ]
  | [
      value: ConfigT[KeyT],
      set: (value: ConfigT[KeyT]) => Promise<void>,
      fetched: true,
      isDefault: boolean,
      reset: () => Promise<void>
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
  const [configFetched, configValue] = useGlobalConfigState(
    useShallow((config) => [!!config, config?.[key]])
  )

  const [userConfiguredKeysFetched, isUserConfiguredKey] =
    useUserConfiguredGlobalConfigKeys(
      useShallow((all_keys) => [!!all_keys, all_keys?.[key]])
    )

  useEffect(() => {
    if (!configFetched)
      window.api.config.global.get().then(useGlobalConfigState.setState)
  }, [configFetched])

  useEffect(() => {
    if (!userConfiguredKeysFetched) {
      window.api.config.global
        .getUserConfiguredKeys()
        .then(useUserConfiguredGlobalConfigKeys.setState)
    }
  }, [userConfiguredKeysFetched])

  const setter = useCallback(
    async (value: GlobalConfig[KeyT]) =>
      window.api.config.global.set(key, value),
    [key]
  )

  const resetter = useCallback(
    async () => window.api.config.global.reset(key),
    [key]
  )

  if (!configFetched || !userConfiguredKeysFetched)
    return [undefined, setter, false, undefined, resetter]
  return [configValue!, setter, true, !isUserConfiguredKey, resetter]
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
    maybeAppName ??
    (isDefault
      ? useContext(GameContext).appName
      : useContext(SettingsContext).appName)
  const runner =
    maybeRunner ??
    (isDefault
      ? useContext(GameContext).runner
      : useContext(SettingsContext).runner)

  if (appName === 'default')
    throw new Error(
      'useGameConfig called with appName=default. Are you inside a Game-/SettingsContext?'
    )

  const [configFetched, configValue] = useGameConfigState(
    useShallow((config) => [
      !!config[`${appName}_${runner}`],
      config[`${appName}_${runner}`]?.[key]
    ])
  )

  const [userConfiguredKeysFetched, isUserConfiguredKey] =
    useUserConfiguredGameConfigKeys(
      useShallow((all_keys) => [
        key in (all_keys[`${appName}_${runner}`] ?? {}),
        all_keys[`${appName}_${runner}`]?.[key]
      ])
    )

  useEffect(() => {
    if (!configFetched)
      window.api.config.game.get(appName, runner).then((config) => {
        useGameConfigState.setState({
          [`${appName}_${runner}`]: config
        })
      })
  }, [configFetched])

  useEffect(() => {
    if (!userConfiguredKeysFetched) {
      window.api.config.game
        .getUserConfiguredKeys(appName, runner)
        .then((keys) => {
          useUserConfiguredGameConfigKeys.setState(() => ({
            [`${appName}_${runner}`]: keys
          }))
        })
    }
  }, [userConfiguredKeysFetched])

  const setter = useCallback(
    async (value: GameConfig[KeyT]) =>
      window.api.config.game.set(appName, runner, key, value),
    [appName, runner, key]
  )

  const resetter = useCallback(
    async () => window.api.config.game.reset(appName, runner, key),
    [appName, runner, key]
  )

  if (!configFetched) return [undefined, setter, false, undefined, resetter]
  return [configValue!, setter, true, !isUserConfiguredKey, resetter]
}

export { useSharedConfig, useGlobalConfig, useGameConfig }
