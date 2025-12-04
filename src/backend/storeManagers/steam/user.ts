import { SteamLoginUser } from 'common/types/steam'
import { existsSync } from 'graceful-fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from '@node-steam/vdf'

import { GlobalConfig } from 'backend/config'
import { logDebug, logError, LogPrefix } from 'backend/logger'

// Supports multiple Steam accounts
export async function loadUsers(): Promise<Array<SteamLoginUser>> {
  const { defaultSteamPath } = GlobalConfig.get().getSettings()
  const steamPath = defaultSteamPath.replaceAll("'", '')

  const loginUsersConfigPath = path.join(steamPath, 'config', 'loginusers.vdf')

  if (!existsSync(loginUsersConfigPath)) {
    logError(
      ['Unable to load Steam users, file doesnt exist', loginUsersConfigPath],
      { prefix: LogPrefix.Steam }
    )
    return []
  }
  logDebug(['Loading loginusers data'], { prefix: LogPrefix.Steam })
  const fileData = await readFile(loginUsersConfigPath, { encoding: 'utf8' })
  try {
    const loginUsers = parse(fileData)
    if (!loginUsers.users) {
      return []
    }

    return Object.keys(loginUsers.users).map((userId: string) => ({
      id: userId,
      ...loginUsers.users[userId]
    }))
  } catch (e) {
    logError('Failed to load steam users', { prefix: LogPrefix.Steam })
    return []
  }
}
