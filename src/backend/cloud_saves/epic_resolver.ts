import { app } from 'electron'
import { isAbsolute } from 'path'
import type { GameInfo, GameSettings } from 'common/types'
import { getWinePath } from '../launcher'
import { resolveEpicTemplate } from './epic_template'

const WINDOWS_VARS =
  /\{(?:appdata|userdir|userprofile|usersavedgames|locallow|roaming)\}/i
const UNRESOLVED_TOKEN = /\{[A-Za-z0-9_]+\}/

export const resolveEpicSavePath = async ({
  gameInfo,
  gameSettings,
  accountId,
  isNative
}: {
  gameInfo: GameInfo
  gameSettings: GameSettings
  accountId?: string
  isNative: boolean
}): Promise<string | undefined> => {
  const template = gameInfo.save_folder
  if (!template) {
    return undefined
  }

  if (/\{epicid\}/i.test(template) && !accountId) {
    return undefined
  }

  if (/\{installdir\}/i.test(template) && !gameInfo.install?.install_path) {
    return undefined
  }

  const isWindowsHost = process.platform === 'win32'
  const homeDir = isWindowsHost
    ? (process.env.USERPROFILE ?? app.getPath('home'))
    : app.getPath('home')

  const vars = {
    installPath: gameInfo.install?.install_path ?? '',
    accountId: accountId ?? '',
    home: homeDir,
    appData: app.getPath('appData'),
    documents: isWindowsHost
      ? `${homeDir}/Documents`
      : app.getPath('documents'),
    windows: false,
    localAppData: isWindowsHost ? process.env.LOCALAPPDATA : undefined,
    roaming: isWindowsHost ? process.env.APPDATA : undefined,
    savedGames: isWindowsHost ? `${homeDir}/Saved Games` : undefined,
    localLow: isWindowsHost ? `${homeDir}/AppData/LocalLow` : undefined
  }

  const hasWindowsVars = WINDOWS_VARS.test(template)

  const isValid = (path: string): boolean =>
    !!path &&
    !UNRESOLVED_TOKEN.test(path) &&
    !path.includes('%') &&
    isAbsolute(path.replace(/\\/g, '/'))

  if (isNative || !hasWindowsVars) {
    const resolved = resolveEpicTemplate(template, vars).replace(/\\/g, '/')
    return isValid(resolved) ? resolved : undefined
  }

  if (/\{installdir\}/i.test(template)) {
    return undefined
  }

  const windowsPath = resolveEpicTemplate(template, { ...vars, windows: true })
  if (UNRESOLVED_TOKEN.test(windowsPath)) {
    return undefined
  }

  const resolved = (
    await getWinePath({ path: windowsPath, gameSettings })
  ).replace(/\\/g, '/')
  return isValid(resolved) ? resolved : undefined
}
