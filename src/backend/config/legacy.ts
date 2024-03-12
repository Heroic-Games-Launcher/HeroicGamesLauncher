import { PositiveInteger } from 'backend/schemas'
import type {
  LatestGameConfigJson,
  GameConfig,
  LatestGlobalConfigJson,
  GlobalConfig
} from './schemas'
import {
  LegacyGameConfig,
  LegacyGameConfigJson,
  LegacyGlobalConfig,
  LegacyGlobalConfigJson
} from './schemas/legacy'

function migrateLegacyGlobalConfig(
  legacyConfig: LegacyGlobalConfigJson['defaultSettings'],
  defaultConfig: GlobalConfig
): LatestGlobalConfigJson {
  const newConfig: Partial<GlobalConfig> = {}

  // Lists keys that can simply be assigned to the new object
  const sharedKeys: (keyof typeof legacyConfig & keyof GlobalConfig)[] = [
    'autoInstallDxvk',
    'autoInstallDxvkNvapi',
    'autoInstallVkd3d',
    'battlEyeRuntime',
    'eacRuntime',
    'showFps',
    'showMangohud',
    'wineVersion',
    'addDesktopShortcuts',
    'addStartMenuShortcuts',
    'addSteamShortcuts',
    'autoUpdateGames',
    'checkForUpdatesOnStartup',
    'customThemesPath',
    'customWinePaths',
    'darkTrayIcon',
    'defaultInstallPath',
    'disableController',
    'disableLogs',
    'disablePlaytimeSync',
    'downloadNoHttps',
    'egsLinkedPath',
    'exitToTray',
    'framelessWindow',
    'hideChangelogsOnStartup',
    'libraryTopSection',
    'maxRecentGames'
  ]

  // Lists keys that have a different name now, but are otherwise the same
  const renamedKeys: [keyof typeof legacyConfig, keyof GlobalConfig][] = [
    ['wineCrossoverBottle', 'crossoverBottle'],
    ['enableEsync', 'eSync'],
    ['enableFsync', 'fSync'],
    ['useGameMode', 'gameMode'],
    ['preferSystemLibs', 'preferSystemLibraries'],
    ['nvidiaPrime', 'useDedicatedGpu'],
    ['altLegendaryBin', 'alternativeLegendaryBinary'],
    ['altGogdlBin', 'alternativeGogdlBinary'],
    ['altNileBin', 'alternativeNileBinary'],
    ['discordRPC', 'discordRichPresence'],
    ['minimizeOnLaunch', 'minimizeOnGameLaunch'],
    ['startInTray', 'startMinimizedToTray'],
    ['defaultSteamPath', 'steamPath']
  ]

  if (legacyConfig.maxWorkers)
    newConfig.maxDownloadWorkers = PositiveInteger.parse(
      legacyConfig.maxWorkers
    )
  else newConfig.maxDownloadWorkers = null

  // Wine versions are tricky to equality-check (the name might just be
  // different, with the executable being the same)
  if (legacyConfig.wineVersion?.bin === defaultConfig.wineVersion.bin)
    delete legacyConfig.wineVersion

  // These are default values that shouldn't actually be set to these values
  // by default *now* (a Legendary binary or CrossOver bottle of "" doesn't make
  // much sense)
  if (legacyConfig.altLegendaryBin === '') delete legacyConfig.altLegendaryBin
  if (legacyConfig.altGogdlBin === '') delete legacyConfig.altGogdlBin
  if (legacyConfig.altNileBin === '') delete legacyConfig.altNileBin
  if (legacyConfig.wineCrossoverBottle === '')
    delete legacyConfig.wineCrossoverBottle
  if (legacyConfig.customThemesPath === '') delete legacyConfig.customThemesPath

  if (legacyConfig.experimentalFeatures?.enableHelp) newConfig.enableHelp = true
  if (legacyConfig.experimentalFeatures?.enableNewDesign)
    newConfig.enableNewDesign = true
  if (legacyConfig.experimentalFeatures?.automaticWinetricksFixes)
    newConfig.automaticWinetricksFixes = true

  return migrationHelper(
    legacyConfig,
    newConfig,
    defaultConfig,
    sharedKeys,
    renamedKeys
  )
}

function migrateLegacyGameConfig(
  legacyConfig: LegacyGameConfigJson[string],
  defaultConfig: GameConfig
): LatestGameConfigJson {
  const newConfig: Partial<GameConfig> = {}

  const sharedKeys: (keyof typeof legacyConfig & keyof GameConfig)[] = [
    'autoInstallDxvk',
    'autoInstallDxvkNvapi',
    'autoInstallVkd3d',
    'battlEyeRuntime',
    'eacRuntime',
    'ignoreGameUpdates',
    'showFps',
    'showMangohud',
    'targetExe',
    'winePrefix',
    'wineVersion'
  ]

  const renamedKeys: [keyof typeof legacyConfig, keyof GameConfig][] = [
    ['wineCrossoverBottle', 'crossoverBottle'],
    ['enableEsync', 'eSync'],
    ['enviromentOptions', 'environmentVariables'],
    ['enableFsync', 'fSync'],
    ['useGameMode', 'gameMode'],
    ['language', 'gameLanguage'],
    ['launcherArgs', 'launcherArgs'],
    ['preferSystemLibs', 'preferSystemLibraries'],
    ['offlineMode', 'runGameOffline'],
    ['nvidiaPrime', 'useDedicatedGpu'],
    ['useSteamRuntime', 'steamRuntime']
  ]

  if (legacyConfig.savesPath || legacyConfig.gogSaves) {
    newConfig.savePaths = []

    if (legacyConfig.savesPath)
      newConfig.savePaths.push({
        key: 'Saves',
        value: legacyConfig.savesPath
      })

    if (legacyConfig.gogSaves)
      newConfig.savePaths.push(
        ...legacyConfig.gogSaves.map(({ name, location }) => ({
          key: name,
          value: location
        }))
      )
  }

  if (legacyConfig.wrapperOptions) {
    newConfig.wrappers = []
    for (const wrapper of legacyConfig.wrapperOptions) {
      newConfig.wrappers.push({
        executable: wrapper.exe,
        arguments: wrapper.args
      })
    }
  }

  if (legacyConfig.wineCrossoverBottle === '')
    delete legacyConfig.wineCrossoverBottle
  if (legacyConfig.language === '') delete legacyConfig.language

  if (legacyConfig.wineVersion?.bin === defaultConfig.wineVersion.bin)
    delete legacyConfig.wineVersion

  return migrationHelper(
    legacyConfig,
    newConfig,
    defaultConfig,
    sharedKeys,
    renamedKeys
  )
}

// This function consolidates some common tasks both migration functions have to
// do
function migrationHelper<
  OldType extends LegacyGameConfig | LegacyGlobalConfig,
  NewType extends Partial<GameConfig | GlobalConfig>
>(
  legacyConfig: OldType,
  newConfig: NewType,
  defaultSettings: NewType,
  sharedKeys: (keyof OldType & keyof NewType)[],
  renamedKeys: [keyof OldType, keyof NewType][]
): { version: 'v1'; settings: Partial<NewType> } {
  // Move shared keys from old to new config
  for (const key of sharedKeys)
    if (key in legacyConfig) newConfig[key] = legacyConfig[key] as never

  // Add renamed keys with their new name
  for (const [oldKey, newKey] of renamedKeys)
    if (oldKey in legacyConfig)
      newConfig[newKey] = legacyConfig[oldKey] as never

  // Some keys require more complex migration
  if (legacyConfig.DXVKFpsCap && !isNaN(parseInt(legacyConfig.DXVKFpsCap)))
    newConfig.dxvkFpsLimit = {
      enabled: true,
      limit: parseInt(legacyConfig.DXVKFpsCap)
    }
  if (legacyConfig.enableFSR)
    newConfig.fsr = {
      enabled: true,
      sharpness: legacyConfig.maxSharpness ?? 2
    }
  if (legacyConfig.gamescope) {
    const {
      windowType,
      gameWidth,
      gameHeight,
      enableLimiter,
      enableUpscaling,
      fpsLimiter,
      fpsLimiterNoFocus,
      upscaleWidth,
      upscaleHeight,
      upscaleMethod
    } = legacyConfig.gamescope
    newConfig.gamescope = {
      windowType: windowType || null,
      enableUpscaling: false,
      enableLimiter: false
    }

    if (enableUpscaling) {
      newConfig.gamescope = {
        ...newConfig.gamescope,
        enableUpscaling: true,
        gameWidth:
          gameWidth && !isNaN(parseInt(gameWidth)) ? parseInt(gameWidth) : null,
        gameHeight:
          gameHeight && !isNaN(parseInt(gameHeight))
            ? parseInt(gameHeight)
            : null,
        upscaleHeight:
          upscaleHeight && !isNaN(parseInt(upscaleHeight))
            ? parseInt(upscaleHeight)
            : null,
        upscaleWidth:
          upscaleWidth && !isNaN(parseInt(upscaleWidth))
            ? parseInt(upscaleWidth)
            : null,
        upscaleMethod: upscaleMethod || null
      }
    }

    if (enableLimiter) {
      newConfig.gamescope = {
        ...newConfig.gamescope,
        enableLimiter: true,
        fpsLimiter:
          fpsLimiter && !isNaN(parseInt(fpsLimiter))
            ? parseInt(fpsLimiter)
            : null,
        fpsLimiterNoFocus:
          fpsLimiterNoFocus && !isNaN(parseInt(fpsLimiterNoFocus))
            ? parseInt(fpsLimiterNoFocus)
            : null
      }
    }
  }

  // The old config system had a habit of storing default values for keys. If we
  // just include these in the new object, they would show up as user-modified.
  // So instead, filter out all keys that are currently set to the default
  // values. This will have false positives, but it's better than the
  // alternative
  return { version: 'v1', settings: filterObject(newConfig, defaultSettings) }
}

// Returns an object with some of obj1's keys. A key is only added to the object
// if JSON.stringify(obj1[key]) is not equal to JSON.stringify(obj2[key])
function filterObject<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T
): Partial<T> {
  const reducedObj: Partial<T> = {}
  for (const key of Object.keys(obj1) as (keyof T)[])
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      reducedObj[key] = obj1[key]
    }
  return reducedObj
}

export { migrateLegacyGlobalConfig, migrateLegacyGameConfig }
