import { readdir } from 'fs/promises'
import { parse } from 'path'

import { isLinux } from 'backend/constants/environment'
import { gamesConfigPath } from 'backend/constants/paths'
import { GameConfig } from 'backend/game_config'
import { logDebug } from 'backend/logger'

import type { Migration } from '..'

export class UmuSteamRuntimeMigration implements Migration {
  identifier = 'umu-steam-runtime'
  async run() {
    if (!isLinux) return true

    for (const entry of await readdir(gamesConfigPath, {
      withFileTypes: true
    })) {
      const filename = entry.name
      if (!entry.isFile() || !filename.endsWith('.json')) continue
      const appName = parse(filename).name
      const config = GameConfig.get(appName)
      const settings = (await config.getSettings()) as {
        useSteamRuntime?: boolean
      }
      // NOTE: This will also set the option for non-native games, but the
      //       option is not actually used for them, so it should be fine
      if (settings.useSteamRuntime) {
        config.setSetting('steamRuntime', 'umu-scout')
        logDebug(['Enabled new Steam Runtime option for', appName])
      }
    }
    return true
  }
}
