import {
  parseBuffer,
  ShortcutEntry,
  ShortcutObject,
  writeBuffer
} from 'steam-shortcut-editor'
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'

import { isSteamRunning } from 'backend/shortcuts/nonesteamgame/steamProcess'

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

type SteamShortcutIconMigrationResult = {
  changed: number
  deferred: boolean
  errors: string[]
}

function rewriteSteamEntryIcon(
  entry: ShortcutEntry,
  legacyIconsPath: string,
  newIconsPath: string
): boolean {
  const values = entry as unknown as Record<string, unknown>
  const iconKey = Object.keys(values).find((key) => key.toLowerCase() === 'icon')
  if (!iconKey || typeof values[iconKey] !== 'string') return false

  const icon = values[iconKey]
  if (icon !== legacyIconsPath && !icon.startsWith(`${legacyIconsPath}/`)) {
    return false
  }

  values[iconKey] = newIconsPath + icon.slice(legacyIconsPath.length)
  return true
}

function readSteamShortcuts(path: string): Partial<ShortcutObject> {
  return parseBuffer(readFileSync(path), {
    autoConvertArrays: true,
    autoConvertBooleans: true,
    dateProperties: ['LastPlayTime']
  })
}

export function rewriteSteamShortcutIconPaths(
  steamPaths: string[],
  legacyIconsPath: string,
  newIconsPath: string
): SteamShortcutIconMigrationResult {
  const result: SteamShortcutIconMigrationResult = {
    changed: 0,
    deferred: false,
    errors: []
  }

  for (const steamPath of new Set(steamPaths.filter(Boolean))) {
    const userdataPath = join(steamPath, 'userdata')
    if (!existsSync(userdataPath)) continue

    const steamRunning = isSteamRunning(steamPath)
    for (const user of readdirSync(userdataPath, { withFileTypes: true })) {
      if (!user.isDirectory()) continue

      const shortcutsPath = join(
        userdataPath,
        user.name,
        'config',
        'shortcuts.vdf'
      )
      if (!existsSync(shortcutsPath)) continue

      let shortcuts: Partial<ShortcutObject>
      try {
        shortcuts = readSteamShortcuts(shortcutsPath)
      } catch (error) {
        result.errors.push(`Failed to read ${shortcutsPath}: ${String(error)}`)
        continue
      }

      const entries = shortcuts.shortcuts ?? []
      const matchingEntries = entries.filter((entry) => {
        const values = entry as unknown as Record<string, unknown>
        const iconKey = Object.keys(values).find(
          (key) => key.toLowerCase() === 'icon'
        )
        const icon = iconKey ? values[iconKey] : undefined
        return (
          typeof icon === 'string' &&
          (icon === legacyIconsPath || icon.startsWith(`${legacyIconsPath}/`))
        )
      })

      if (!matchingEntries.length) continue
      if (steamRunning) {
        result.deferred = true
        continue
      }

      for (const entry of matchingEntries) {
        if (rewriteSteamEntryIcon(entry, legacyIconsPath, newIconsPath)) {
          result.changed += 1
        }
      }

      const temporaryPath = `${shortcutsPath}.heroic-xdg-migration`
      try {
        writeFileSync(temporaryPath, writeBuffer(shortcuts))
        renameSync(temporaryPath, shortcutsPath)
      } catch (error) {
        rmSync(temporaryPath, { force: true })
        result.errors.push(`Failed to update ${shortcutsPath}: ${String(error)}`)
      }
    }
  }

  return result
}
