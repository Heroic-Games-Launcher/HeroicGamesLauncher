import { app } from 'electron'
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

  const vars = {
    installPath: gameInfo.install?.install_path ?? '',
    accountId: accountId ?? '',
    home: app.getPath('home'),
    appData: app.getPath('appData'),
    documents: app.getPath('documents'),
    windows: false
  }

  const hasWindowsVars = WINDOWS_VARS.test(template)

  if (isNative || !hasWindowsVars) {
    const resolved = resolveEpicTemplate(template, vars)
    return UNRESOLVED_TOKEN.test(resolved) ? undefined : resolved
  }

  if (/\{installdir\}/i.test(template)) {
    return undefined
  }

  const windowsPath = resolveEpicTemplate(template, { ...vars, windows: true })
  if (UNRESOLVED_TOKEN.test(windowsPath)) {
    return undefined
  }

  const resolved = await getWinePath({ path: windowsPath, gameSettings })
  return resolved || undefined
}
