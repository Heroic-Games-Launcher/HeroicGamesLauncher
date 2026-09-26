import { app } from 'electron'
import { copy, remove } from 'fs-extra'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'

import { isLinux } from 'backend/constants/environment'
import {
  appFolder,
  configPath,
  heroicCachePath,
  heroicDataPath,
  heroicIconFolder,
  legacyToolsPath,
  toolsPath,
  userHome
} from 'backend/constants/paths'
import { logInfo, logWarning } from 'backend/logger'
import { moveIfDestinationMissing } from './xdg_helpers'
import {
  rewriteHeroicDesktopShortcutIconPaths,
  rewriteSteamShortcutIconPaths
} from './xdg_shortcuts'

import type { Migration } from '..'

const iconsMigrationMarker = '.heroic-xdg-icons-migration'

export class XdgPathsMigration implements Migration {
  identifier = 'xdg-paths'

  async run() {
    if (!isLinux) return true

    await this.migrateTools()
    const iconsMigrated = await this.migrateIcons()

    await Promise.all([
      moveIfDestinationMissing(
        join(appFolder, 'images-cache'),
        join(heroicCachePath, 'images-cache')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'areweanticheatyet.json'),
        join(heroicCachePath, 'areweanticheatyet.json')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'known_fixes.json'),
        join(heroicCachePath, 'known_fixes.json')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'game_overrides_images'),
        join(heroicDataPath, 'game_overrides_images')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'legendaryConfig'),
        join(heroicDataPath, 'legendaryConfig')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'gogdlConfig'),
        join(heroicDataPath, 'gogdlConfig')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'nile_config'),
        join(heroicDataPath, 'nile_config')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'gog_store', 'auth.json'),
        join(heroicDataPath, 'gog_store', 'auth.json')
      ),
      moveIfDestinationMissing(
        join(appFolder, 'zoom_store', '.zoom.token'),
        join(heroicDataPath, 'zoom_store', '.zoom.token')
      )
    ])

    return iconsMigrated
  }

  private getSteamPaths(): string[] {
    const paths = new Set([
      join(userHome, '.steam', 'steam'),
      join(userHome, '.local', 'share', 'Steam'),
      join(
        userHome,
        '.var',
        'app',
        'com.valvesoftware.Steam',
        '.steam',
        'steam'
      )
    ])

    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
          defaultSettings?: { defaultSteamPath?: unknown }
        }
        const configuredPath = config.defaultSettings?.defaultSteamPath
        if (typeof configuredPath === 'string' && configuredPath) {
          paths.add(
            configuredPath
              .replaceAll("'", '')
              .replace(/^~(?=\/)/, userHome)
          )
        }
      } catch {
        // Config parsing errors are handled by GlobalConfig. Falling back to
        // the standard Steam locations is sufficient for this migration.
      }
    }

    return [...paths]
  }

  private async migrateIcons(): Promise<boolean> {
    const legacyIconsPath = join(appFolder, 'icons')
    if (legacyIconsPath === heroicIconFolder) return true

    const markerPath = join(heroicIconFolder, iconsMigrationMarker)
    const legacyExists = existsSync(legacyIconsPath)
    const destinationExists = existsSync(heroicIconFolder)
    const migrationInProgress = existsSync(markerPath)

    if (legacyExists && destinationExists && !migrationInProgress) {
      logWarning([
        'Not migrating legacy icons directory because destination exists:',
        heroicIconFolder
      ])
      return true
    }

    if (!legacyExists && !destinationExists) return true

    if (legacyExists) {
      if (!destinationExists) {
        mkdirSync(heroicIconFolder, { recursive: true })
        writeFileSync(markerPath, '')
      }

      // Keep both paths valid while shortcut references are rewritten. The
      // marker makes an interrupted copy safely resumable on the next start.
      await copy(legacyIconsPath, heroicIconFolder, { overwrite: true })
    }

    rewriteHeroicDesktopShortcutIconPaths(
      [
        app.getPath('desktop'),
        join(userHome, '.local', 'share', 'applications')
      ],
      legacyIconsPath,
      heroicIconFolder
    )

    const steamMigration = rewriteSteamShortcutIconPaths(
      this.getSteamPaths(),
      legacyIconsPath,
      heroicIconFolder
    )
    for (const error of steamMigration.errors) {
      logWarning(error)
    }
    if (steamMigration.errors.length > 0) return false

    if (steamMigration.deferred) {
      logInfo(
        'Deferring XDG icon cleanup until Steam is not running so its shortcuts can be updated safely.'
      )
      return false
    }

    if (existsSync(legacyIconsPath)) {
      await remove(legacyIconsPath)
    }
    if (existsSync(markerPath)) {
      unlinkSync(markerPath)
    }

    return true
  }

  private async migrateTools() {
    if (legacyToolsPath === toolsPath || !existsSync(legacyToolsPath)) return

    // Preserve user-managed symlink setups. compatibility_layers.ts keeps
    // scanning the legacy path as a fallback.
    if (lstatSync(legacyToolsPath).isSymbolicLink()) {
      logInfo([
        'Leaving symlinked legacy tools path in place:',
        legacyToolsPath
      ])
      return
    }

    // Avoid merging two independently populated tool trees. Both paths remain
    // discoverable, and all future Heroic-managed downloads use toolsPath.
    if (existsSync(toolsPath)) {
      logWarning([
        'Not migrating legacy tools directory because destination exists:',
        toolsPath
      ])
      return
    }

    const moved = await moveIfDestinationMissing(legacyToolsPath, toolsPath)
    if (!moved) return

    try {
      // Existing game settings and Wine Manager metadata store absolute paths.
      symlinkSync(toolsPath, legacyToolsPath, 'dir')
    } catch (error) {
      // A concurrent primary process may have created the same compatibility
      // link after our move. Treat that as success; otherwise roll back.
      if (
        existsSync(legacyToolsPath) &&
        lstatSync(legacyToolsPath).isSymbolicLink()
      ) {
        return
      }

      await moveIfDestinationMissing(toolsPath, legacyToolsPath)
      throw error
    }
  }
}
