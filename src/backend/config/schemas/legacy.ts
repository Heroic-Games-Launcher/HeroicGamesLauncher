import { z } from 'zod'
import { KeyValuePair, WineInstallation } from 'backend/schemas'
import { LibraryTopSectionOptions } from './index'

const ExperimentalFeatures = z.record(
  z.enum(['enableNewDesign', 'enableHelp', 'automaticWinetricksFixes']),
  z.boolean()
)

const GOGCloudSave = z.object({
  name: z.string(),
  location: z.string()
})

// Game/global config schema used before the current settings system was
// introduced. The system lacked validation, meaning we don't know which keys
// might be in there and which might be missing
const LegacyGameConfig = z
  .object({
    DXVKFpsCap: z.string(),
    autoInstallDxvk: z.boolean(),
    autoInstallDxvkNvapi: z.boolean(),
    autoInstallVkd3d: z.boolean(),
    autoSyncSaves: z.boolean(),
    battlEyeRuntime: z.boolean(),
    eacRuntime: z.boolean(),
    enableDXVKFpsLimit: z.boolean(),
    enableEsync: z.boolean(),
    enableFSR: z.boolean(),
    enableFsync: z.boolean(),
    enviromentOptions: KeyValuePair.array(),
    gamescope: z
      .object({
        enableUpscaling: z.boolean(),
        enableLimiter: z.boolean(),
        windowType: z.enum(['fullscreen', 'borderless', '']),
        gameWidth: z.string(),
        gameHeight: z.string(),
        upscaleWidth: z.string(),
        upscaleHeight: z.string(),
        upscaleMethod: z.enum(['fsr', 'nis', 'integer', 'stretch', '']),
        fpsLimiter: z.string(),
        fpsLimiterNoFocus: z.string()
      })
      .partial(),
    gogSaves: GOGCloudSave.array(),
    ignoreGameUpdates: z.boolean(),
    language: z.string(),
    launcherArgs: z.string(),
    maxSharpness: z.number(),
    nvidiaPrime: z.boolean(),
    offlineMode: z.boolean(),
    otherOptions: z.string(),
    preferSystemLibs: z.boolean(),
    savesPath: z.string(),
    showFps: z.boolean(),
    showMangohud: z.boolean(),
    targetExe: z.string(),
    useGameMode: z.boolean(),
    useSteamRuntime: z.boolean(),
    wineCrossoverBottle: z.string(),
    winePrefix: z.string(),
    wineVersion: WineInstallation,
    wrapperOptions: z
      .object({
        exe: z.string(),
        args: z.string()
      })
      .array()
  })
  .partial()
type LegacyGameConfig = z.infer<typeof LegacyGameConfig>

const LegacyGlobalConfig = LegacyGameConfig.extend({
  addDesktopShortcuts: z.boolean(),
  addStartMenuShortcuts: z.boolean(),
  addSteamShortcuts: z.boolean(),
  altGogdlBin: z.string(),
  altLegendaryBin: z.string(),
  altNileBin: z.string(),
  autoUpdateGames: z.boolean(),
  checkForUpdatesOnStartup: z.boolean(),
  checkUpdatesInterval: z.number(),
  customThemesPath: z.string(),
  customWinePaths: z.string().array(),
  darkTrayIcon: z.boolean(),
  defaultInstallPath: z.string(),
  defaultSteamPath: z.string(),
  defaultWinePrefix: z.string(),
  disableController: z.boolean(),
  disablePlaytimeSync: z.boolean(),
  disableLogs: z.boolean(),
  discordRPC: z.boolean(),
  downloadNoHttps: z.boolean(),
  egsLinkedPath: z.string(),
  enableUpdates: z.boolean(),
  exitToTray: z.boolean(),
  experimentalFeatures: ExperimentalFeatures,
  framelessWindow: z.boolean(),
  hideChangelogsOnStartup: z.boolean(),
  libraryTopSection: LibraryTopSectionOptions,
  maxRecentGames: z.number(),
  maxWorkers: z.number(),
  minimizeOnLaunch: z.boolean(),
  startInTray: z.boolean()
}).partial()
type LegacyGlobalConfig = z.infer<typeof LegacyGlobalConfig>

const LegacyGameConfigJson = z
  .object({
    version: z.enum(['auto', 'v0', 'v0.1']),
    explicit: z.literal(true)
  })
  .catchall(LegacyGameConfig)
type LegacyGameConfigJson = z.infer<typeof LegacyGameConfigJson>

const LegacyGlobalConfigJson = z.object({
  version: z.enum(['auto', 'v0', 'v0.1']),
  defaultSettings: LegacyGlobalConfig
})
type LegacyGlobalConfigJson = z.infer<typeof LegacyGlobalConfigJson>

export {
  LegacyGlobalConfig,
  LegacyGlobalConfigJson,
  LegacyGameConfig,
  LegacyGameConfigJson
}
