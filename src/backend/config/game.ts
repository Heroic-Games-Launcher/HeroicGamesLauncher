import { join } from 'path'
import type { Runner } from 'common/types'
import { removeSpecialcharacters } from '../utils'
import { gameManagerMap } from '../storeManagers'
import { logInfo, logWarning, LogPrefix } from '../logger/logger'

import { migrateLegacyGameConfig } from './legacy'
import { getConfigPath, loadConfigFile } from './shared'
import {
  type GameConfigV1,
  type GlobalConfigV1,
  type LatestGameConfigJson,
  latestGameConfigJson,
  GameConfig
} from './schemas'
import { LegacyGameConfigJson } from './schemas/legacy'
import { rmSync, writeFileSync } from 'graceful-fs'
import { getGlobalConfig } from './global'
import { sendFrontendMessage } from '../main_window'
import type { z } from 'zod'

// In-memory cache for game config keys set by the user
const gameConfigRecord: Map<string, Partial<GameConfig>> = new Map()

const pastGameConfigVersions = [LegacyGameConfigJson]

function getGameConfig(appName: string, runner: Runner): GameConfig {
  const userSetConfig =
    gameConfigRecord.get(`${appName}_${runner}`) ??
    loadGameConfig(appName, runner)
  return {
    ...getDefaultGameConfig(appName, runner),
    ...userSetConfig
  }
}

function setGameConfig<Key extends keyof GameConfig>(
  appName: string,
  runner: Runner,
  key: Key,
  value: GameConfig[Key]
): void {
  const gameConfig =
    gameConfigRecord.get(`${appName}_${runner}`) ??
    loadGameConfig(appName, runner)

  const keyWasUserConfigured = key in gameConfig
  const oldValue = getGameConfig(appName, runner)[key]
  // Log change if the value actually changed
  if (
    !keyWasUserConfigured ||
    JSON.stringify(oldValue) !== JSON.stringify(value)
  )
    logInfo(
      [
        `${appName}_${runner}: Changing`,
        key,
        'from',
        oldValue,
        keyWasUserConfigured ? 'to' : '(default value) to',
        value
      ],
      LogPrefix.GameConfig
    )

  gameConfig[key] = value

  // Write changed config to config file
  const gameConfigFilePath = getConfigPath(appName, runner)
  const fullGameConfigObject: LatestGameConfigJson = {
    version: 'v1',
    settings: gameConfig
  }
  writeFileSync(
    gameConfigFilePath,
    JSON.stringify(fullGameConfigObject, null, 2)
  )

  sendFrontendMessage('gameConfigChanged', appName, runner, key, value)
}

function resetGameConfigKey(
  appName: string,
  runner: Runner,
  key: string
): void {
  const gameConfig =
    gameConfigRecord.get(`${appName}_${runner}`) ??
    loadGameConfig(appName, runner)
  delete gameConfig[key]

  const defaultValue = getDefaultGameConfig(appName, runner)[key]

  logInfo(
    [`${appName}_${runner}: Resetting`, key, 'to default value:', defaultValue],
    LogPrefix.Backend
  )

  const gameConfigFilePath = getConfigPath(appName, runner)
  const fullGameConfigObject: LatestGameConfigJson = {
    version: 'v1',
    settings: gameConfig
  }
  writeFileSync(
    gameConfigFilePath,
    JSON.stringify(fullGameConfigObject, null, 2)
  )

  sendFrontendMessage('gameConfigKeyReset', appName, runner, key, defaultValue)
}

function clearGameConfig(appName: string, runner: Runner) {
  const configPath = getConfigPath(appName, runner)
  try {
    rmSync(configPath)
  } catch (e) {
    logWarning(
      ['Failed to delete config file for', appName, runner, e],
      LogPrefix.GameConfig
    )
  }
  gameConfigRecord.delete(`${appName}_${runner}`)

  logInfo([`${appName}_${runner}: Cleared config`], LogPrefix.GameConfig)

  sendFrontendMessage('gameConfigCleared', appName, runner)
}

function getUserConfiguredGameConfigKeys(
  appName: string,
  runner: Runner
): Record<keyof GameConfig, boolean> {
  const gameConfig =
    gameConfigRecord.get(`${appName}_${runner}`) ??
    loadGameConfig(appName, runner)
  return Object.fromEntries(
    GameConfig.keyof().options.map((key) => [key, key in gameConfig])
  ) as Record<keyof GameConfig, boolean>
}

function loadGameConfig(appName: string, runner: Runner): Partial<GameConfig> {
  const configPath = getConfigPath(appName, runner)
  const gameConfig = loadConfigFile(
    configPath,
    latestGameConfigJson,
    pastGameConfigVersions,
    (pastVersion) => updatePastGameConfig(pastVersion, appName, runner)
  )
  gameConfigRecord.set(`${appName}_${runner}`, gameConfig.settings)
  return gameConfig.settings
}

function getDefaultGameConfig(appName: string, runner: Runner): GameConfig {
  const globalConfig = getGlobalConfig()
  const defaultKeysNotCoveredInGlobalConfig: Omit<
    GameConfigV1,
    Exclude<keyof GlobalConfigV1, 'winePrefix'>
  > = {
    ignoreGameUpdates: false,
    gameLanguage: globalConfig.language,
    launcherArgs: null,
    targetExe: null,
    runGameOffline: false,
    get winePrefix() {
      const gameTitle = removeSpecialcharacters(
        gameManagerMap[runner].getGameInfo(appName).title
      )
      return join(globalConfig.defaultInstallPath, 'Prefixes', gameTitle)
    },
    savePaths: null
  }
  // We need an extra `GameConfig.parse` here to filter out global config keys
  // that are not supposed to be in the GameConfig object
  return GameConfig.parse({
    ...globalConfig,
    ...defaultKeysNotCoveredInGlobalConfig
  })
}

function updatePastGameConfig(
  pastVersion: z.infer<(typeof pastGameConfigVersions)[number]>,
  appName: string,
  runner: Runner
): LatestGameConfigJson {
  logInfo(
    [
      'Updating game config object from',
      pastVersion.version,
      'to',
      latestGameConfigJson.shape.version.value
    ],
    LogPrefix.Backend
  )

  switch (pastVersion.version) {
    case 'v0':
    case 'v0.1':
    case 'auto':
      return migrateLegacyGameConfig(
        pastVersion[appName],
        getDefaultGameConfig(appName, runner)
      )
  }
}

export {
  pastGameConfigVersions,
  getGameConfig,
  setGameConfig,
  resetGameConfigKey,
  clearGameConfig,
  getUserConfiguredGameConfigKeys
}
