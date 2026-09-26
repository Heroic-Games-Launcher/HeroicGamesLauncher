import { app } from 'electron'
import { existsSync, lstatSync, symlinkSync } from 'graceful-fs'
import { join } from 'path'

import { isLinux } from 'backend/constants/environment'
import {
  appFolder,
  heroicCachePath,
  heroicDataPath,
  heroicIconFolder,
  legacyToolsPath,
  toolsPath,
  userHome
} from 'backend/constants/paths'
import { logInfo, logWarning } from 'backend/logger'
import {
  moveIfDestinationMissing,
  rewriteHeroicDesktopShortcutIconPaths
} from './xdg_helpers'

import type { Migration } from '..'

export class XdgPathsMigration implements Migration {
  identifier = 'xdg-paths'

  async run() {
    if (!isLinux) return true

    await this.migrateTools()
    await this.migrateIcons()

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

    return true
  }

  private async migrateIcons() {
    const legacyIconsPath = join(appFolder, 'icons')
    if (legacyIconsPath === heroicIconFolder) return

    if (existsSync(legacyIconsPath) && existsSync(heroicIconFolder)) {
      logWarning([
        'Not migrating legacy icons directory because destination exists:',
        heroicIconFolder
      ])
      return
    }

    await moveIfDestinationMissing(legacyIconsPath, heroicIconFolder)

    // Rewriting the generated shortcuts removes the need for a compatibility
    // symlink in XDG_CONFIG_HOME. This also makes the migration resumable if a
    // previous run moved the icons but exited before updating the shortcuts.
    if (!existsSync(legacyIconsPath) && existsSync(heroicIconFolder)) {
      rewriteHeroicDesktopShortcutIconPaths(
        [
          app.getPath('desktop'),
          join(userHome, '.local', 'share', 'applications')
        ],
        legacyIconsPath,
        heroicIconFolder
      )
    }
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
