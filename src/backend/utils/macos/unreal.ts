import { existsSync, readdirSync } from 'graceful-fs'
import { chmod, mkdir, readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'

export interface UnrealTweak {
  cvar: string
  value: string
  reason: string
}

interface UnrealProfile {
  id: string
  title: string
  /** Folder name below `AppData/Local` the game saves its config in */
  project: string
  /** Path of the game's shipping binary relative to its install folder, used to identify the game */
  shippingBinary: string
  tweaks: UnrealTweak[]
}

/**
 * Every console variable listed here was verified to exist in the game's
 * shipping binary; Unreal silently ignores unknown ones
 */
export const UNREAL_PROFILES: UnrealProfile[] = [
  {
    id: 'hellblade2',
    title: "Senua's Saga: Hellblade II",
    project: 'Hellblade2',
    shippingBinary: 'Hellblade2/Binaries/Win64/Hellblade2-Win64-Shipping.exe',
    tweaks: [
      {
        cvar: 'r.NT.EnableConstrainAspectRatio',
        value: '0',
        reason: 'fill the whole screen instead of the forced 2.39:1 frame'
      },
      {
        cvar: 'r.NT.Lens.Softness.Intensity',
        value: '0',
        reason: 'no simulated lens blur towards the screen edges'
      },
      {
        cvar: 'r.NT.Lens.ChromaticAberration.Intensity',
        value: '0',
        reason: 'no color fringing'
      },
      {
        cvar: 'r.SceneColorFringeQuality',
        value: '0',
        reason: 'no color fringing'
      },
      {
        cvar: 'r.NT.Lens.Distortion.Intensity',
        value: '0',
        reason: 'no barrel distortion'
      },
      {
        cvar: 'r.FilmGrain',
        value: '0',
        reason: 'no film grain'
      }
    ]
  }
]

const SECTION = 'SystemSettings'

function findUnrealProfile(gameRoots: string[]): UnrealProfile | undefined {
  return UNREAL_PROFILES.find((profile) =>
    gameRoots.some((root) => existsSync(join(root, profile.shippingBinary)))
  )
}

const isHeader = (line: string) => /^\s*\[.+\]\s*$/.test(line)
const isSectionHeader = (line: string) => line.trim() === `[${SECTION}]`

/** Drops `[SystemSettings]` headers that have no entries below them */
function dropEmptySections(lines: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (isSectionHeader(lines[i])) {
      let next = i + 1
      while (next < lines.length && !lines[next].trim()) next++
      if (next === lines.length || isHeader(lines[next])) {
        i = next - 1
        continue
      }
    }
    result.push(lines[i])
  }
  while (result.length && !result[result.length - 1].trim()) result.pop()
  return result.length ? [...result, ''] : []
}

/**
 * Removes every `cvar` Heroic owns from all `[SystemSettings]` sections, then
 * adds the wanted values to the end of the first one. Unreal merges duplicate
 * sections and drops comments when it saves the file, so the owned keys alone
 * identify what Heroic manages and the layout survives Unreal's rewrites
 *
 * @param tweaks The values to write, or an empty list to only remove them
 */
export function applyTweaksToIni(
  content: string,
  ownedCvars: string[],
  tweaks: UnrealTweak[]
): string {
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const owned = new Set(ownedCvars.map((cvar) => cvar.toLowerCase()))

  const kept: string[] = []
  let inSection = false
  let inFirstSection = false
  let insertAt: number | undefined
  let removed = false
  for (const line of content.split(/\r?\n/)) {
    if (isHeader(line)) {
      inSection = isSectionHeader(line)
      inFirstSection = inSection && insertAt === undefined
      kept.push(line)
      if (inFirstSection) insertAt = kept.length
      continue
    }
    const key = line.split('=')[0].trim().toLowerCase()
    if (inSection && line.includes('=') && owned.has(key)) {
      removed = true
      continue
    }
    kept.push(line)
    if (inFirstSection && line.trim()) insertAt = kept.length
  }

  const entries = tweaks.map(({ cvar, value }) => `${cvar}=${value}`)
  if (insertAt !== undefined) {
    kept.splice(insertAt, 0, ...entries)
  } else if (entries.length) {
    while (kept.length && !kept[kept.length - 1].trim()) kept.pop()
    if (kept.length) kept.push('')
    kept.push(`[${SECTION}]`, ...entries, '')
  }
  return (removed ? dropEmptySections(kept) : kept).join(eol)
}

export function findUserDirectory(
  prefix: string,
  project: string
): string | undefined {
  const usersDir = join(prefix, 'drive_c', 'users')
  let users: string[]
  try {
    users = readdirSync(usersDir).filter((user) => user !== 'Public')
  } catch {
    return
  }
  const withProject = users.find((user) =>
    existsSync(join(usersDir, user, 'AppData', 'Local', project))
  )
  const withAppData = users.find((user) =>
    existsSync(join(usersDir, user, 'AppData', 'Local'))
  )
  const user = withProject ?? withAppData
  return user ? join(usersDir, user) : undefined
}

function engineIniPaths(userDir: string, project: string): string[] {
  const configDir = join(
    userDir,
    'AppData',
    'Local',
    project,
    'Saved',
    'Config'
  )
  // Steam/GOG/Epic builds use `Windows`, Microsoft Store/Game Pass builds `WinGDK`
  const platforms = ['Windows', 'WinGDK'].filter((platform) =>
    existsSync(join(configDir, platform))
  )
  return (platforms.length ? platforms : ['Windows']).map((platform) =>
    join(configDir, platform, 'Engine.ini')
  )
}

async function writeKeepingWritable(path: string, content: string) {
  // Unreal can't save its settings into read-only config files
  const mode = await stat(path)
    .then((info) => info.mode)
    .catch(() => undefined)
  if (mode !== undefined && (mode & 0o200) === 0) {
    await chmod(path, mode | 0o200)
  }
  await writeFile(path, content, 'utf-8')
}

/**
 * Adds or removes the profile's tweaks in the game's `Engine.ini`
 *
 * @returns A description of what changed, or nothing if no change was needed
 */
export async function syncUnrealTweaks(
  prefix: string,
  gameRoots: string[],
  enabled: boolean
): Promise<string | undefined> {
  const profile = findUnrealProfile(gameRoots)
  if (!profile) return

  const userDir = findUserDirectory(prefix, profile.project)
  if (!userDir) return

  const owned = profile.tweaks.map((tweak) => tweak.cvar)
  const changedFiles: string[] = []
  for (const iniPath of engineIniPaths(userDir, profile.project)) {
    const current = await readFile(iniPath, 'utf-8').catch(() => '')
    if (!current && !enabled) continue

    const updated = applyTweaksToIni(
      current,
      owned,
      enabled ? profile.tweaks : []
    )
    if (updated === current) continue

    await mkdir(join(iniPath, '..'), { recursive: true })
    await writeKeepingWritable(iniPath, updated)
    changedFiles.push(iniPath)
  }
  if (!changedFiles.length) return

  if (!enabled) {
    return `Removed Heroic's Unreal Engine tweaks for ${profile.title} from ${changedFiles.join(', ')}`
  }
  const summary = profile.tweaks
    .map((tweak) => `${tweak.cvar}=${tweak.value} (${tweak.reason})`)
    .join('; ')
  return `Applied Unreal Engine tweaks for ${profile.title} to ${changedFiles.join(', ')}: ${summary}`
}
