import { moveSync } from 'fs-extra'
import { existsSync, readFileSync, rmSync } from 'graceful-fs'
import { join } from 'path'
import { z } from 'zod'

import type { Runner } from 'common/types'
import type { WineInstallation } from 'backend/schemas'
import { configPath, gamesConfigPath, isLinux, isMac } from '../constants'
import { logWarning, LogPrefix } from '../logger/logger'
import { getLinuxWineSet, getMacOsWineSet } from '../utils/compatibility_layers'

import type { latestGameConfigJson, latestGlobalConfigJson } from './schemas'
import { loadGlobalConfig, type pastGlobalConfigVersions } from './global'
import type { pastGameConfigVersions } from './game'

async function initConfig() {
  await detectWineVersions()
  loadGlobalConfig()
}

function getConfigPath(): string
function getConfigPath(appName: string, runner: Runner): string
function getConfigPath(appName?: string, runner?: Runner): string {
  if (!appName || !runner) return configPath

  // Migrate AppName-only settings file if it's present
  const oldGameConfigPath = join(gamesConfigPath, `${appName}.json`)
  const newGameConfigPath = join(gamesConfigPath, `${appName}_${runner}.json`)
  if (existsSync(oldGameConfigPath)) {
    if (existsSync(newGameConfigPath)) rmSync(oldGameConfigPath)
    else moveSync(oldGameConfigPath, newGameConfigPath)
  }

  return newGameConfigPath
}

/**
 * Loads a config file from disk, validates it, and updates it if necessary
 * @param configFilePath The path to the config file to load
 * @param currentVersionSchema The schema for the current version of the config file
 * @param pastVersionSchemas The schemas for all past versions of the config file
 * @param updaterFunc A function that takes a parsed config file of a past version and returns a parsed config file of the current version
 */
function loadConfigFile<
  CurrentSchema extends
    | typeof latestGameConfigJson
    | typeof latestGlobalConfigJson,
  PastSchemas extends
    | typeof pastGameConfigVersions
    | typeof pastGlobalConfigVersions
>(
  configFilePath: string,
  currentVersionSchema: CurrentSchema,
  pastVersionSchemas: PastSchemas,
  updaterFunc: (
    pastVersion: z.infer<PastSchemas[number]>
  ) => z.infer<CurrentSchema>
): z.infer<CurrentSchema> {
  let rawConfig = {}
  try {
    rawConfig = JSON.parse(readFileSync(configFilePath, 'utf-8'))
  } catch (e) {
    logWarning(
      [
        'Got exception when reading config file',
        configFilePath,
        '. This is normal if this is a fresh copy of Heroic. Going to use all-default settings!',
        e
      ],
      LogPrefix.Backend
    )
  }

  const currentVersionParseResult = currentVersionSchema.safeParse(rawConfig)
  let parsedConfig: z.infer<CurrentSchema> | null = null
  // If the stored config is on the current version, great, just use it
  if (currentVersionParseResult.success) {
    parsedConfig = currentVersionParseResult.data
  } else {
    // If they aren't on the latest version, try all the past versions
    for (const pastGlobalConfigVersion of pastVersionSchemas) {
      const pastVersionParseResult =
        pastGlobalConfigVersion.safeParse(rawConfig)
      // If one of the past versions parses, convert it to the latest and use it
      if (pastVersionParseResult.success) {
        parsedConfig = updaterFunc(pastVersionParseResult.data)
        break
      }
    }
  }

  // If we weren't able to parse any config file, return the default config
  if (parsedConfig === null)
    // By default, no config keys are modified
    parsedConfig = {
      version: 'v1',
      settings: {}
    }

  return parsedConfig
}

const availableWineVersions: WineInstallation[] = []

async function detectWineVersions(): Promise<void> {
  if (isMac) availableWineVersions.push(...(await getMacOsWineSet()))
  else if (isLinux) availableWineVersions.push(...(await getLinuxWineSet()))
}

export { initConfig, getConfigPath, loadConfigFile, availableWineVersions }
