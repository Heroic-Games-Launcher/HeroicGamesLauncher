import { move } from 'fs-extra'
import { existsSync, lstatSync, mkdirSync, symlinkSync } from 'graceful-fs'
import { dirname, join } from 'path'

import { isLinux } from 'backend/constants/environment'
import {
  appFolder,
  heroicCachePath,
  heroicDataPath,
  heroicIconFolder,
  legacyToolsPath,
  toolsPath
} from 'backend/constants/paths'
import { logInfo, logWarning } from 'backend/logger'

import type { Migration } from '..'

async function moveIfDestinationMissing(source: string, destination: string) {
  if (!existsSync(source) || existsSync(destination)) return
  mkdirSync(dirname(destination), { recursive: true })
  await move(source, destination)
}

export class XdgPathsMigration implements Migration {
  identifier = 'xdg-paths'

  async run() {
    if (!isLinux) return true

    await this.migrateTools()

    await Promise.all([
      moveIfDestinationMissing(join(appFolder, 'icons'), heroicIconFolder),
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

    mkdirSync(dirname(toolsPath), { recursive: true })
    await move(legacyToolsPath, toolsPath)

    try {
      // Existing game settings and Wine Manager metadata store absolute paths.
      symlinkSync(toolsPath, legacyToolsPath, 'dir')
    } catch (error) {
      // Roll back instead of leaving existing configured paths broken.
      await move(toolsPath, legacyToolsPath)
      throw error
    }
  }
}
