import { move, moveSync } from 'fs-extra'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs'
import { dirname, join } from 'path'

export async function moveIfDestinationMissing(
  source: string,
  destination: string
): Promise<boolean> {
  if (!existsSync(source) || existsSync(destination)) return false

  mkdirSync(dirname(destination), { recursive: true })
  try {
    await move(source, destination)
    return true
  } catch (error) {
    // Another Heroic process may have completed the same migration after our
    // existence checks. In that case, the destination is authoritative.
    if (existsSync(destination)) return false
    throw error
  }
}

export function moveSyncIfDestinationMissing(
  source: string,
  destination: string
): boolean {
  if (!existsSync(source) || existsSync(destination)) return false

  mkdirSync(dirname(destination), { recursive: true })
  try {
    moveSync(source, destination)
    return true
  } catch (error) {
    if (existsSync(destination)) return false
    throw error
  }
}

export function rewriteHeroicDesktopShortcutIconPaths(
  directories: string[],
  legacyIconsPath: string,
  newIconsPath: string
) {
  const legacyPrefix = `Icon=${legacyIconsPath}/`
  const newPrefix = `Icon=${newIconsPath}/`

  for (const directory of directories) {
    if (!existsSync(directory)) continue

    for (const entry of readdirSync(directory)) {
      if (!entry.endsWith('.desktop')) continue

      const shortcutPath = join(directory, entry)
      let shortcut: string
      try {
        shortcut = readFileSync(shortcutPath, 'utf8')
      } catch {
        continue
      }

      // Only touch shortcuts created by Heroic itself. User-authored desktop
      // files may legitimately reference files under the old directory.
      if (
        !shortcut.includes('Exec=xdg-open heroic://launch?') ||
        !shortcut.includes(legacyPrefix)
      ) {
        continue
      }

      writeFileSync(
        shortcutPath,
        shortcut.replaceAll(legacyPrefix, newPrefix),
        'utf8'
      )
    }
  }
}
