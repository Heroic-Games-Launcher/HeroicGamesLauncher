import { existsSync } from 'graceful-fs'
import { readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  boolProperty,
  findProperty,
  mapEntry,
  nameProperty,
  parseGvas,
  serializeGvas,
  structFields,
  type GvasProperty
} from './gvas'
import { findUserDirectory } from './unreal'

interface GraphicsUpgradeOptions {
  /** DLSS runs on MetalFX, so it can be selected as the game's upscaler */
  dlss: boolean
  /** DLSS Frame Generation runs as MetalFX frame interpolation */
  frameGeneration: boolean
  /** GPU cores of the Mac, 0 if unknown */
  gpuCores: number
}

/** The GPU the highest settings were measured on, an M4 Max with 32 cores */
const MEASURED_GPU_CORES = 32

/** Smaller GPUs keep the settings games pick unless the player opts in */
export const HIGHEST_GRAPHICS_MIN_GPU_CORES = 30

interface GraphicsPresetProfile {
  id: string
  title: string
  /** Folder name below `AppData/Local` the game saves its settings in */
  project: string
  /** Path of the game's shipping binary relative to its install folder, used to identify the game */
  shippingBinary: string
  /** Name of the graphics settings save in `Saved/SaveGames`, without the platform and extension */
  saveName: string
  saveClass: string
  /** The save and boolean property recording that the game finished its first launch */
  firstLaunch: { saveName: string; property: string }
  /**
   * The `IntPoint` property of the `firstLaunch` save holding the resolution
   * the game renders at in borderless fullscreen. Under Wine the game picks one
   * smaller than its window on its first launch, and upscales from a fraction
   * of the window's resolution
   */
  targetResolution?: string
  /**
   * Raises the settings in the save's properties to the highest the game
   * offers, with an upscaler mode the game stays smooth at in its window
   *
   * @returns A description of every change, empty if nothing changed
   */
  upgrade: (
    properties: GvasProperty[],
    options: GraphicsUpgradeOptions,
    windowSize?: Resolution
  ) => string[]
}

function insertBefore(
  properties: GvasProperty[],
  property: GvasProperty,
  before: string[]
) {
  const index = properties.findIndex(({ name }) => before.includes(name))
  if (index === -1) properties.push(property)
  else properties.splice(index, 0, property)
}

/** Sets a name property, adding it if missing. Returns the previous value if it changed */
function setName(
  properties: GvasProperty[],
  name: string,
  value: string,
  before: string[] = []
): { changed: boolean; previous?: string } {
  const existing = findProperty(properties, name)
  if (!existing) {
    insertBefore(properties, nameProperty(name, value), before)
    return { changed: true }
  }
  if (existing.value.kind !== 'string' || existing.value.value === value) {
    return { changed: false }
  }
  const previous = existing.value.value
  existing.value = { kind: 'string', value }
  return { changed: true, previous }
}

function setBool(
  properties: GvasProperty[],
  name: string,
  value: boolean,
  before: string[]
): boolean {
  const existing = findProperty(properties, name)
  if (!existing) {
    insertBefore(properties, boolProperty(name, value), before)
    return true
  }
  if (existing.value.kind !== 'bool' || existing.value.value === value) {
    return false
  }
  existing.value = { kind: 'bool', value }
  return true
}

/**
 * The game's highest preset, read from its `NTUI/Data/BaseGraphics` asset.
 * The `Ultra` value of the preset enum has no settings behind it
 */
const HELLBLADE2_HIGHEST_PRESET: Record<string, string> = {
  ShadowQuality: 'High',
  GlobalIlluminationQuality: 'High',
  ReflectionQuality: 'High',
  TextureQuality: 'High',
  PostProcessingQuality: 'High',
  FoliageDetail: 'High',
  ViewDistance: 'High',
  VolumetricFog: 'High',
  AntiAliasingQuality: 'High',
  EffectsQuality: 'High'
}

/** Properties of `NTVMGraphicsSettingsSaveModel` in the order the game writes them */
const HELLBLADE2_AFTER_DYNAMIC_RESOLUTION = [
  'IsDynamicResolution_DefaultUpscaler',
  'DynamicResolutionMin',
  'DynamicResolutionTargetFramerate',
  'GlobalQualityPreset',
  'UpscalerId',
  'ReflexId',
  'UpscalerSettings',
  'DataVersion'
]
const HELLBLADE2_AFTER_PRESET = HELLBLADE2_AFTER_DYNAMIC_RESOLUTION.slice(4)
const HELLBLADE2_AFTER_UPSCALER = HELLBLADE2_AFTER_PRESET.slice(1)

/**
 * The game's DLSS modes from sharpest to fastest, with how many times smaller
 * than the window's width and height they render
 */
const HELLBLADE2_DLSS_MODES = [
  { id: 'Quality', label: 'Quality', divisor: 1.5 },
  { id: 'Balanced', label: 'Balanced', divisor: 1.72 },
  { id: 'Performance', label: 'Performance', divisor: 2 },
  { id: 'UltraPerformance', label: 'Ultra Performance', divisor: 3 }
]

/**
 * The most pixels DLSS upscales from on {@link MEASURED_GPU_CORES} GPU cores,
 * as many as 720p has. With every setting at High, an M4 Max (32-core GPU)
 * renders about 18 frames per second just below it (Ultra Performance at
 * 5120x1440), and about 15 at twice as many
 */
const HELLBLADE2_DLSS_MAX_PIXELS = 1280 * 720

/**
 * The sharpest DLSS mode within {@link HELLBLADE2_DLSS_MAX_PIXELS}, scaled by
 * the size of the GPU. Quality without a window size
 */
function hellblade2DlssMode(gpuCores: number, windowSize?: Resolution) {
  if (!windowSize) return HELLBLADE2_DLSS_MODES[0]
  const pixels = windowSize.width * windowSize.height
  const budget =
    (HELLBLADE2_DLSS_MAX_PIXELS * (gpuCores || MEASURED_GPU_CORES)) /
    MEASURED_GPU_CORES
  return (
    HELLBLADE2_DLSS_MODES.find(
      ({ divisor }) => pixels / divisor ** 2 <= budget
    ) ?? HELLBLADE2_DLSS_MODES[HELLBLADE2_DLSS_MODES.length - 1]
  )
}

function upgradeHellblade2(
  properties: GvasProperty[],
  { dlss, frameGeneration, gpuCores }: GraphicsUpgradeOptions,
  windowSize?: Resolution
): string[] {
  const changes: string[] = []

  let preset = findProperty(properties, 'GlobalQualityPreset')
  if (!preset) {
    preset = {
      name: 'GlobalQualityPreset',
      type: 'StructProperty',
      arrayIndex: 0,
      tag: {
        structName: 'NTGlobalQualityPreset',
        structGuid: Buffer.alloc(16)
      },
      value: { kind: 'properties', properties: [] }
    }
    insertBefore(properties, preset, HELLBLADE2_AFTER_PRESET)
  }
  const presetFields = structFields(preset.value)
  if (presetFields) {
    const raised = Object.entries(HELLBLADE2_HIGHEST_PRESET).filter(
      ([setting, value]) => setName(presetFields, setting, value).changed
    )
    if (raised.length) {
      changes.push(
        `graphics quality: every setting at its highest level, High (raised ${raised.map(([setting]) => setting).join(', ')})`
      )
    }
  }

  // Lowers the resolution whenever the frame rate drops below its target,
  // which blurs the image
  if (
    setBool(
      properties,
      'IsDynamicResolution',
      false,
      HELLBLADE2_AFTER_DYNAMIC_RESOLUTION
    )
  ) {
    changes.push(
      'dynamic resolution: off, the game renders at a fixed resolution'
    )
  }

  // The game only lists DLSS when it found a working DLSS runtime
  const dlssSettings = structFields(
    mapEntry(findProperty(properties, 'UpscalerSettings'), 'DLSS')
  )
  if (dlss && dlssSettings) {
    const upscaler = setName(
      properties,
      'UpscalerId',
      'DLSS',
      HELLBLADE2_AFTER_UPSCALER
    )
    const mode = hellblade2DlssMode(gpuCores, windowSize)
    const modeChanged = setName(dlssSettings, 'QualityModeId', mode.id).changed
    const frameGenerationChanged =
      frameGeneration &&
      setName(dlssSettings, 'FrameGenerationId', 'On', [
        'IsAutoSharpness',
        'Sharpness'
      ]).changed
    if (upscaler.changed || modeChanged || frameGenerationChanged) {
      const window = windowSize
        ? ` for the ${windowSize.width}x${windowSize.height} window`
        : ''
      const generated = frameGeneration
        ? ', with DLSS Frame Generation (MetalFX frame interpolation)'
        : ''
      changes.push(
        `upscaler: DLSS (on MetalFX) in ${mode.label} mode${window}${generated}`
      )
    }
  }
  return changes
}

export const GRAPHICS_PRESET_PROFILES: GraphicsPresetProfile[] = [
  {
    id: 'hellblade2',
    title: "Senua's Saga: Hellblade II",
    project: 'Hellblade2',
    shippingBinary: 'Hellblade2/Binaries/Win64/Hellblade2-Win64-Shipping.exe',
    saveName: 'GraphicsSettings',
    saveClass: '/Script/NTUI.NTVMGraphicsSettingsSaveModel',
    firstLaunch: { saveName: 'SystemSettings', property: 'bFirstLaunch' },
    targetResolution: 'TargetRes',
    upgrade: upgradeHellblade2
  }
]

function findGraphicsPresetProfile(
  gameRoots: string[]
): GraphicsPresetProfile | undefined {
  return GRAPHICS_PRESET_PROFILES.find((profile) =>
    gameRoots.some((root) => existsSync(join(root, profile.shippingBinary)))
  )
}

/**
 * Upgrades the settings in a graphics save
 *
 * @returns The new file contents and the changes, or nothing if no change was needed
 */
export function upgradeGraphicsSave(
  data: Buffer,
  profile: GraphicsPresetProfile,
  options: GraphicsUpgradeOptions,
  windowSize?: Resolution
): { data: Buffer; changes: string[] } | undefined {
  const save = parseGvas(data)
  if (save.saveClass !== profile.saveClass) {
    throw new Error(
      `The ${profile.saveName} save holds a ${save.saveClass}, not ${profile.saveClass}`
    )
  }
  const changes = profile.upgrade(save.properties, options, windowSize)
  if (!changes.length) return
  return { data: serializeGvas(save), changes }
}

interface Resolution {
  width: number
  height: number
}

/**
 * Sets the `IntPoint` property `property` of a save to `resolution`
 *
 * @returns The new file contents and the change, or nothing if no change was needed
 */
export function setTargetResolution(
  data: Buffer,
  property: string,
  { width, height }: Resolution
): { data: Buffer; change: string } | undefined {
  const save = parseGvas(data)
  const target = findProperty(save.properties, property)
  if (
    target?.tag.structName !== 'IntPoint' ||
    target.value.kind !== 'raw' ||
    target.value.data.length !== 8
  ) {
    return
  }
  const previous = `${target.value.data.readInt32LE(0)}x${target.value.data.readInt32LE(4)}`
  if (previous === `${width}x${height}`) return
  const point = Buffer.alloc(8)
  point.writeInt32LE(width, 0)
  point.writeInt32LE(height, 4)
  target.value = { kind: 'raw', data: point }
  return {
    data: serializeGvas(save),
    change: `resolution: ${width}x${height}, the size of the game's window (the game picked ${previous}, and upscaled its image from a fraction of the window's resolution)`
  }
}

/** Records, per profile, that Heroic raised the settings the game picked on its first launch */
const PREFIX_MANIFEST = '.heroic-graphics.json'

type PrefixManifest = Record<string, { raised: string }>

async function readManifest(prefix: string): Promise<PrefixManifest> {
  try {
    return JSON.parse(
      await readFile(join(prefix, PREFIX_MANIFEST), 'utf-8')
    ) as PrefixManifest
  } catch {
    return {}
  }
}

async function writeManifest(prefix: string, manifest: PrefixManifest) {
  const path = join(prefix, PREFIX_MANIFEST)
  if (Object.keys(manifest).length) {
    await writeFile(path, JSON.stringify(manifest, null, 2))
  } else {
    await rm(path, { force: true })
  }
}

// Steam/GOG/Epic builds use `Windows`, Microsoft Store/Game Pass builds `WinGDK`
const SAVE_PLATFORMS = ['Windows', 'WinGDK']

function findSave(saved: string, name: string): string | undefined {
  return SAVE_PLATFORMS.map((platform) =>
    join(saved, 'SaveGames', `${name}.${platform}.sav`)
  ).find((path) => existsSync(path))
}

/** The size of the game's window, which Unreal saves in `GameUserSettings.ini` */
async function readWindowSize(saved: string): Promise<Resolution | undefined> {
  for (const platform of SAVE_PLATFORMS) {
    const ini = await readFile(
      join(saved, 'Config', platform, 'GameUserSettings.ini'),
      'utf-8'
    ).catch(() => '')
    const read = (key: string) =>
      Number(new RegExp(`^${key}=(\\d+)\\s*$`, 'm').exec(ini)?.[1])
    const width = read('ResolutionSizeX')
    const height = read('ResolutionSizeY')
    if (width > 0 && height > 0) return { width, height }
  }
  return
}

/** Sets the profile's target resolution to the size of the game's window */
async function matchTargetResolution(
  saved: string,
  profile: GraphicsPresetProfile,
  windowSize: Resolution
): Promise<string | undefined> {
  const savePath = findSave(saved, profile.firstLaunch.saveName)
  if (!profile.targetResolution || !savePath) return
  const result = setTargetResolution(
    await readFile(savePath),
    profile.targetResolution,
    windowSize
  )
  if (!result) return
  await writeFile(savePath, result.data)
  return result.change
}

/**
 * Whether the game finished its first launch. Until then it replaces the
 * graphics settings with the ones it picks from a hardware benchmark
 */
async function finishedFirstLaunch(
  saved: string,
  profile: GraphicsPresetProfile
): Promise<boolean> {
  const path = findSave(saved, profile.firstLaunch.saveName)
  if (!path) return false
  const property = findProperty(
    parseGvas(await readFile(path)).properties,
    profile.firstLaunch.property
  )
  // Unreal leaves out properties that still have their default value (`true`)
  return property?.value.kind === 'bool' && !property.value.value
}

type GraphicsPresetResult =
  | { status: 'raised'; message: string }
  | { status: 'waiting-for-first-launch'; message: string }
  | { status: 'unchanged' }

/**
 * Raises the graphics settings of a supported game to the highest it offers,
 * with an upscaler mode it stays smooth at in its window, and its target
 * resolution to the size of that window, once after the game picked its own
 * settings on its first launch. Changes
 * the player makes in the game afterwards are kept. Meant to run both before
 * the game starts and after it exits, since the game only writes its settings
 * during its first launch
 */
export async function syncGraphicsPreset(
  prefix: string,
  gameRoots: string[],
  enabled: boolean,
  options: GraphicsUpgradeOptions
): Promise<GraphicsPresetResult> {
  const profile = findGraphicsPresetProfile(gameRoots)
  if (!profile) return { status: 'unchanged' }

  const manifest = await readManifest(prefix)
  const forget = async () => {
    if (!manifest[profile.id]) return
    delete manifest[profile.id]
    await writeManifest(prefix, manifest)
  }
  if (!enabled) {
    // Turning the setting back on raises the settings again
    await forget()
    return { status: 'unchanged' }
  }

  const userDir = findUserDirectory(prefix, profile.project)
  const saved =
    userDir && join(userDir, 'AppData', 'Local', profile.project, 'Saved')
  const savePath = saved && findSave(saved, profile.saveName)
  if (!saved || !savePath || !(await finishedFirstLaunch(saved, profile))) {
    await forget()
    return {
      status: 'waiting-for-first-launch',
      message: `${profile.title} picks its own graphics settings on its first launch. Heroic raises them to the highest once the game has saved them, after it exits`
    }
  }
  if (manifest[profile.id]) return { status: 'unchanged' }

  const windowSize = await readWindowSize(saved)
  const result = upgradeGraphicsSave(
    await readFile(savePath),
    profile,
    options,
    windowSize
  )
  if (result) await writeFile(savePath, result.data)
  const resolution =
    windowSize && (await matchTargetResolution(saved, profile, windowSize))
  manifest[profile.id] = { raised: new Date().toISOString() }
  await writeManifest(prefix, manifest)
  const changes = [
    ...(result?.changes ?? []),
    ...(resolution ? [resolution] : [])
  ]
  if (!changes.length) return { status: 'unchanged' }
  return {
    status: 'raised',
    message: `Raised ${profile.title}'s graphics settings in ${join(saved, 'SaveGames')}: ${changes.join('; ')}. Changes made in the game from now on are kept`
  }
}
