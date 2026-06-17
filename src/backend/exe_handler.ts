import { dialog } from 'electron'
import { existsSync } from 'graceful-fs'
import { dirname } from 'path'
import { GameConfig } from './game_config'
import { runWineCommand } from './launcher'
import { libraryStore } from './storeManagers/sideload/electronStores'
import { logInfo, LogPrefix } from './logger'
import { GameInfo } from 'common/types'
import { sendFrontendMessage } from './ipc'

let pendingPickerData: { exePath: string; games: GameInfo[] } | null = null

export function checkPendingExeFile(): { exePath: string; games: GameInfo[] } | null {
  const data = pendingPickerData
  pendingPickerData = null
  return data
}

function getSideloadGames(): GameInfo[] {
  const games: GameInfo[] = libraryStore.get('games', [])
  return games.filter(
    (g) => g.runner === 'sideload' && g.title && !g.browserUrl
  )
}

async function launchExe(exePath: string, appName: string) {
  if (!existsSync(exePath)) {
    dialog.showErrorBox('File Not Found', `"${exePath}" does not exist.`)
    return
  }

  const settings = await GameConfig.get(appName).getSettings()
  if (!settings.wineVersion?.bin) {
    dialog.showErrorBox(
      'No Wine Configured',
      `Game "${appName}" has no Wine version configured.`
    )
    return
  }

  logInfo(['Launching', exePath, 'in prefix of', appName], LogPrefix.Backend)

  await runWineCommand({
    commandParts: [exePath],
    gameSettings: settings,
    wait: false,
    protonVerb: 'waitforexitandrun',
    startFolder: dirname(exePath)
  })
}

export async function launchWithExeFile(exePath: string, appName: string) {
  await launchExe(exePath, appName)
}

export function findExeInArgs(args: string[]): string | undefined {
  for (const arg of args) {
    let path: string | undefined

    if (arg.startsWith('file://')) {
      path = decodeURIComponent(arg.slice(7))
    } else if (
      arg.toLowerCase().endsWith('.exe') ||
      arg.toLowerCase().endsWith('.msi') ||
      arg.toLowerCase().endsWith('.bat')
    ) {
      path = arg
    }

    if (path && existsSync(path)) {
      return path
    }
  }
  return undefined
}

export async function handleExeFile(exePath: string) {
  logInfo(['Handling executable:', exePath], LogPrefix.Backend)

  if (!existsSync(exePath)) {
    dialog.showErrorBox('File Not Found', `"${exePath}" does not exist.`)
    return
  }

  const games = getSideloadGames()

  if (games.length === 0) {
    dialog.showErrorBox(
      'No Games Available',
      'No sideloaded games found.\nAdd a game in Heroic first to set up a Wine prefix.'
    )
    return
  }

  if (games.length === 1) {
    await launchExe(exePath, games[0].app_name)
    return
  }

  pendingPickerData = { exePath, games }
  sendFrontendMessage('showExeFilePicker', exePath, games)
}
