import { z } from 'zod'
import {
  KeyValuePair,
  PositiveInteger,
  WineInstallation
} from 'backend/schemas'

const GamescopeSettings = z
  .object({
    windowType: z.enum(['fullscreen', 'borderless']).nullable()
  })
  .and(
    z.discriminatedUnion('enableUpscaling', [
      z.object({
        enableUpscaling: z.literal(false),
        gameWidth: z.unknown(),
        gameHeight: z.unknown(),
        upscaleWidth: z.unknown(),
        upscaleHeight: z.unknown(),
        upscaleMethod: z.unknown()
      }),
      z.object({
        enableUpscaling: z.literal(true),
        gameWidth: z.number().int().nullable(),
        gameHeight: z.number().int().nullable(),
        upscaleWidth: z.number().int().nullable(),
        upscaleHeight: z.number().int().nullable(),
        upscaleMethod: z.enum(['fsr', 'nis', 'integer', 'stretch']).nullable()
      })
    ])
  )
  .and(
    z.discriminatedUnion('enableLimiter', [
      z.object({
        enableLimiter: z.literal(false),
        fpsLimiter: z.unknown(),
        fpsLimiterNoFocus: z.unknown()
      }),
      z.object({
        enableLimiter: z.literal(true),
        fpsLimiter: z.number().int().nullable(),
        fpsLimiterNoFocus: z.number().int().nullable()
      })
    ])
  )
const WrapperOption = z.object({
  executable: z.string(),
  arguments: z.string()
})
type WrapperOption = z.infer<typeof WrapperOption>
const LibraryTopSectionOptions = z.enum([
  'disabled',
  'recently_played',
  'recently_played_installed',
  'favourites'
])
type LibraryTopSectionOptions = z.infer<typeof LibraryTopSectionOptions>

const GameConfigV1 = z.object({
  autoSyncSaves: z.boolean(),
  autoInstallDxvk: z.boolean(),
  autoInstallDxvkNvapi: z.boolean(),
  autoInstallVkd3d: z.boolean(),
  battlEyeRuntime: z.boolean(),
  crossoverBottle: z.string(),
  dxvkFpsLimit: z.union([
    z.object({
      enabled: z.literal(false),
      limit: z.unknown()
    }),
    z.object({ enabled: z.literal(true), limit: z.number().int() })
  ]),
  eSync: z.boolean(),
  eacRuntime: z.boolean(),
  environmentVariables: KeyValuePair.array(),
  fSync: z.boolean(),
  fsr: z.union([
    z.object({ enabled: z.literal(false), sharpness: z.unknown() }),
    z.object({
      enabled: z.literal(true),
      sharpness: z.number().int().min(0).max(5)
    })
  ]),
  gameMode: z.boolean(),
  gamescope: GamescopeSettings,
  ignoreGameUpdates: z.boolean(),
  gameLanguage: z.string(), // TODO: Limit this to 2 characters
  launcherArgs: z.string().nullable(),
  preferSystemLibraries: z.boolean(),
  runGameOffline: z.boolean(),
  savePaths: KeyValuePair.array().nullable(),
  showFps: z.boolean(),
  showMangohud: z.boolean(),
  steamRuntime: z.boolean(),
  targetExe: z.string().nullable(),
  useDedicatedGpu: z.boolean(),
  winePrefix: z.string(),
  wineVersion: WineInstallation,
  wrappers: WrapperOption.array()
})
type GameConfigV1 = z.infer<typeof GameConfigV1>

const GlobalConfigV1 = GameConfigV1.omit({
  ignoreGameUpdates: true,
  gameLanguage: true,
  launcherArgs: true,
  runGameOffline: true,
  savePaths: true,
  targetExe: true
}).extend({
  addDesktopShortcuts: z.boolean(),
  addStartMenuShortcuts: z.boolean(),
  addSteamShortcuts: z.boolean(),
  alternativeGogdlBinary: z.string().nullable(),
  alternativeLegendaryBinary: z.string().nullable(),
  alternativeNileBinary: z.string().nullable(),
  autoUpdateGames: z.boolean(),
  automaticWinetricksFixes: z.boolean(),
  checkForUpdatesOnStartup: z.boolean(),
  customThemesPath: z.string().nullable(),
  customWinePaths: z.string().array(),
  darkTrayIcon: z.boolean(),
  defaultInstallPath: z.string(),
  disableController: z.boolean(),
  disableLogs: z.boolean(),
  disablePlaytimeSync: z.boolean(),
  discordRichPresence: z.boolean(),
  downloadNoHttps: z.boolean(),
  egsLinkedPath: z.string().nullable(),
  enableHelp: z.boolean(),
  enableNewDesign: z.boolean(),
  exitToTray: z.boolean(),
  framelessWindow: z.boolean(),
  hideChangelogsOnStartup: z.boolean(),
  language: z.string(),
  libraryTopSection: LibraryTopSectionOptions,
  maxDownloadWorkers: PositiveInteger.nullable(),
  maxRecentGames: PositiveInteger,
  minimizeOnGameLaunch: z.boolean(),
  startMinimizedToTray: z.boolean(),
  steamPath: z.string(),
  winePrefixBasePath: z.string()
})
type GlobalConfigV1 = z.infer<typeof GlobalConfigV1>

const GameConfigV1Json = z.object({
  version: z.literal('v1'),
  settings: GameConfigV1.partial()
})
const GlobalConfigV1Json = z.object({
  version: z.literal('v1'),
  settings: GlobalConfigV1.partial()
})

// These types are what's returned from the config API
const GameConfig = GameConfigV1
type GameConfig = z.infer<typeof GameConfig>
const GlobalConfig = GlobalConfigV1
type GlobalConfig = z.infer<typeof GlobalConfig>

// These constants/types are what's read out from and stored to disk
const latestGameConfigJson = GameConfigV1Json
const latestGlobalConfigJson = GlobalConfigV1Json
type LatestGameConfigJson = z.infer<typeof latestGameConfigJson>
type LatestGlobalConfigJson = z.infer<typeof latestGlobalConfigJson>

export {
  GameConfigV1,
  GlobalConfigV1,
  GameConfig,
  GlobalConfig,
  latestGameConfigJson,
  type LatestGameConfigJson,
  latestGlobalConfigJson,
  type LatestGlobalConfigJson,
  WrapperOption,
  LibraryTopSectionOptions
}
