import { existsSync } from 'graceful-fs'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { GameSettings } from 'common/types'
import type LogWriter from 'backend/logger/log_writer'
import { isWindows } from 'backend/constants/environment'
import { runWineCommand } from '../../launcher'

/*
 * The EA app updates itself in two steps: it downloads and unpacks the new
 * version next to the old one, then quits and relies on `EADestager.exe` to
 * swap the versions and restart it. On Windows the destager is started by EA's
 * background service. Inside a Wine prefix started by Heroic nothing ever runs
 * it, so the update is never applied. Worse, the EA app sets `IsUnavailable=1`
 * in the registry before quitting. While that flag is set, Link2EA refuses to
 * start, so every following launch of an EA-managed game silently does nothing.
 *
 * This runs the staged destager ourselves before launching an EA-managed game,
 * but only if the EA app left an update pending.
 */

const EA_REG_KEYS = [
  'Software\\\\Electronic Arts\\\\EA Desktop',
  'Software\\\\Wow6432Node\\\\Electronic Arts\\\\EA Desktop'
]
const DEFAULT_INSTALL_LOCATION =
  'C:\\Program Files\\Electronic Arts\\EA Desktop'
// Staged versions are unpacked into folders like `13.805.11.6320-1791874834`
const STAGED_FOLDER_REGEX = /^(\d+(?:\.\d+)+)-\d+$/

interface EAAppRegistryState {
  isUnavailable: boolean
  installLocation?: string
  liveFolder?: string
}

/**
 * Reads the EA app's state from the contents of a prefix's `system.reg`
 */
export function parseEAAppRegistry(systemReg: string): EAAppRegistryState {
  const state: EAAppRegistryState = { isUnavailable: false }

  for (const section of systemReg.split(/\r?\n(?=\[)/)) {
    const header = section.slice(0, section.indexOf(']') + 1)
    if (!EA_REG_KEYS.some((key) => header === `[${key}]`)) continue

    if (/^"IsUnavailable"=dword:0*1\s*$/m.test(section)) {
      state.isUnavailable = true
    }
    state.installLocation ??= readRegString(section, 'InstallLocation')

    // Link2EA lives in the versioned folder of the currently active client
    const link2EA = readRegString(section, 'EaConnectLink2EAAppPath')
    const liveFolder = link2EA
      ?.split('\\')
      .find((part) => STAGED_FOLDER_REGEX.test(part))
    state.liveFolder ??= liveFolder
  }

  return state
}

function readRegString(section: string, name: string): string | undefined {
  const match = section.match(new RegExp(`^"${name}"="(.*)"\\s*$`, 'm'))
  return match?.[1].replaceAll('\\\\', '\\')
}

/**
 * Converts a `C:\...` path into its location inside the prefix
 */
export function prefixPathFromWindowsPath(
  prefixFolder: string,
  windowsPath: string
): string | undefined {
  const match = windowsPath.match(/^c:\\(.*?)\\*$/i)
  if (!match) return undefined
  return join(prefixFolder, 'drive_c', ...match[1].split('\\'))
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff) return diff
  }
  return 0
}

/**
 * Picks the newest staged EA app version folder, or `undefined` if there is none
 * newer than the one currently in use
 */
export function pickStagedFolder(
  folders: string[],
  liveFolder?: string
): string | undefined {
  const versionOf = (folder: string) => folder.match(STAGED_FOLDER_REGEX)?.[1]

  const newest = folders
    .filter((folder) => versionOf(folder))
    .sort((a, b) => compareVersions(versionOf(a)!, versionOf(b)!))
    .pop()
  if (!newest) return undefined

  const liveVersion = liveFolder && versionOf(liveFolder)
  if (liveVersion && compareVersions(versionOf(newest)!, liveVersion) <= 0) {
    return undefined
  }
  return newest
}

async function readTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

async function setIsUnavailable(gameSettings: GameSettings) {
  for (const key of EA_REG_KEYS) {
    await runWineCommand({
      gameSettings,
      commandParts: [
        'reg',
        'add',
        `HKLM\\${key.replaceAll('\\\\', '\\')}`,
        '/v',
        'IsUnavailable',
        '/t',
        'REG_DWORD',
        '/d',
        '0',
        '/f'
      ],
      wait: true,
      protonVerb: 'run'
    })
  }
}

/**
 * Applies an EA app update that the EA app downloaded but could not install
 * by itself (see the comment at the top of this file).
 * Does nothing (and only reads two files) if no update is pending.
 */
export async function applyPendingEAAppUpdate(
  gameSettings: GameSettings,
  logWriter: LogWriter
): Promise<void> {
  const { wineVersion, winePrefix } = gameSettings
  // CrossOver bottles live elsewhere, and on Windows EA's own service handles this
  if (isWindows || wineVersion.type === 'crossover') return

  const prefixFolder =
    wineVersion.type === 'proton' ? join(winePrefix, 'pfx') : winePrefix
  const machineIniPath = join(
    prefixFolder,
    'drive_c',
    'ProgramData',
    'EA Desktop',
    'machine.ini'
  )

  const registry = parseEAAppRegistry(
    await readTextFile(join(prefixFolder, 'system.reg'))
  )
  const machineIni = await readTextFile(machineIniPath)
  const updatePending = /^machine\.updatepending=1\s*$/m.test(machineIni)

  if (!registry.isUnavailable && !updatePending) return

  await logWriter.logInfo([
    'EA app has a pending update',
    { isUnavailable: registry.isUnavailable, updatePending }
  ])

  const installFolder = prefixPathFromWindowsPath(
    prefixFolder,
    registry.installLocation ?? DEFAULT_INSTALL_LOCATION
  )
  const stagedFolder =
    installFolder && existsSync(installFolder)
      ? pickStagedFolder(
          (await readdir(installFolder)).filter((folder) =>
            existsSync(
              join(installFolder, folder, 'Destager', 'EADestager.exe')
            )
          ),
          registry.liveFolder
        )
      : undefined

  if (stagedFolder) {
    await logWriter.logInfo([
      'Applying EA app update',
      stagedFolder,
      '(the EA app will open and close, this can take a minute or two)'
    ])
    // The destager validates the staged files, swaps them in, clears
    // `IsUnavailable` and starts the updated EA app, which exits again
    // once it's done checking for updates
    await runWineCommand({
      gameSettings,
      commandParts: [
        `${registry.installLocation ?? DEFAULT_INSTALL_LOCATION}\\${stagedFolder}\\Destager\\EADestager.exe`.replace(
          /\\{2,}/g,
          '\\'
        ),
        '--launchHelperArgument=true'
      ],
      wait: true,
      protonVerb: 'run'
    })
  } else {
    await logWriter.logInfo(
      'No newer EA app version is staged, only clearing flags'
    )
  }

  // Normally done by the destager, but a leftover flag blocks every launch
  const after = parseEAAppRegistry(
    await readTextFile(join(prefixFolder, 'system.reg'))
  )
  if (after.isUnavailable) {
    await logWriter.logWarning(
      'EA app is still marked unavailable, clearing it'
    )
    await setIsUnavailable(gameSettings)
  }
  if (
    !stagedFolder ||
    (after.liveFolder && after.liveFolder === stagedFolder)
  ) {
    const ini = await readTextFile(machineIniPath)
    if (/^machine\.updatepending=1/m.test(ini)) {
      await writeFile(
        machineIniPath,
        ini.replace(/^machine\.updatepending=1/m, 'machine.updatepending=0')
      )
    }
  }
  await logWriter.logInfo([
    'EA app update check finished, active version:',
    after.liveFolder ?? 'unknown'
  ])
}
