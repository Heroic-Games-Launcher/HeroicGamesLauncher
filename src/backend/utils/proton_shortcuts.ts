import { logError, logWarning } from 'backend/logger'
import {
  DesktopEntry,
  ParsedProtonShorctut
} from 'common/types/proton_shorctuts'
import { readdir, readFile, readlink, stat } from 'fs/promises'
import { parse as iniParse } from 'ini'
import { join, resolve } from 'path'

/**
 * Resolves Windows path to Unix variant by reading dosdevices symlinks
 * @param prefix Wine Prefix path, for proton it needs to be /pfx
 * @param path The dos path that needs to be evaluated
 * @returns Unix path
 */
async function evalDosDevicePath(
  prefix: string,
  path: string
): Promise<string> {
  if (!/^[a-zA-Z]:/.test(path)) return path
  const driveLetter = path.slice(0, 2).toLowerCase()
  const normalizedPath = path.replaceAll('\\', '/')
  try {
    const symlinkPath = await readlink(join(prefix, 'dosdevices', driveLetter))
    const resolvedRoot = resolve(prefix, symlinkPath)
    return resolvedRoot + normalizedPath.slice(2)
  } catch (error) {
    logError(`Failed to evaluate dos path for ${prefix} - ${path} : ${error}`)
    return path
  }
}

/**
 * Resolves highest quality available image for provided icon file name
 * @param icon Icon file name
 * @param protonShortcutsPath Path to proton_shortcuts directory
 * @returns Resolved icon path
 */
async function findImagePath(
  icon: string,
  protonShortcutsPath: string
): Promise<string | undefined> {
  const iconsPath = join(protonShortcutsPath, 'icons')
  const dir = await readdir(iconsPath, {
    withFileTypes: true,
    encoding: 'utf-8'
  })
  const sizes = dir
    .filter((e) => e.isDirectory() && /^\d+x\d+$/.test(e.name))
    .map((e) => ({ name: e.name, px: parseInt(e.name, 10) }))
    .sort((a, b) => b.px - a.px)
  const file = `${icon}.png`

  for (const { name: dir } of sizes) {
    const candidate = join(iconsPath, dir, 'apps', file)
    const canAccess = await stat(candidate)
      .then(() => true)
      .catch(() => false)
    if (canAccess) {
      return candidate
    }
  }
  return
}

export async function loadProtonShortcutsEntries(
  winePrefixPath: string
): Promise<ParsedProtonShorctut[]> {
  if (!(await stat(winePrefixPath).catch(() => false))) {
    logWarning("Prefix path doesn't exist, skipping loading proton_shortcuts")
    return []
  }
  const protonShortcutsPath = join(
    winePrefixPath,
    'pfx/drive_c/proton_shortcuts'
  )
  const shortcuts: ParsedProtonShorctut[] = []
  try {
    const dir = await readdir(protonShortcutsPath, { encoding: 'utf-8' })
    const files = dir.filter((f) => f.endsWith('.desktop'))
    for (const file of files) {
      const contents = await readFile(join(protonShortcutsPath, file), {
        encoding: 'utf-8'
      })
      const desktopFile = iniParse(contents)
      const desktopEntry = desktopFile['Desktop Entry'] as DesktopEntry

      if (
        desktopEntry.Path &&
        !(await stat(desktopEntry.Path).catch(() => false))
      )
        continue

      const execPath = desktopEntry.Exec.replace(/\\(.)/g, '$1')
      const evaluatedPath = await evalDosDevicePath(
        winePrefixPath + '/pfx',
        execPath
      )
      const icon =
        desktopEntry.Icon &&
        (await findImagePath(desktopEntry.Icon, protonShortcutsPath))
      shortcuts.push({
        name: desktopEntry.Name,
        executable: evaluatedPath,
        icon
      })
    }
  } catch (err) {
    logError(['Failed to parse proton shortcuts', err])
    return []
  }

  return shortcuts
}
