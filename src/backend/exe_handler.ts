import { dialog } from 'electron'
import { existsSync } from 'graceful-fs'
import { dirname } from 'path'
import { GameConfig } from './game_config'
import { runWineCommand } from './launcher'
import { libraryStore as sideloadLibraryStore } from './storeManagers/sideload/electronStores'
import { libraryStore as legendaryLibraryStore } from './storeManagers/legendary/electronStores'
import { libraryStore as gogLibraryStore } from './storeManagers/gog/electronStores'
import { libraryStore as nileLibraryStore } from './storeManagers/nile/electronStores'
import { libraryStore as zoomLibraryStore } from './storeManagers/zoom/electronStores'
import { logInfo, LogPrefix } from './logger'
import { GameInfo } from 'common/types'
import { sendFrontendMessage } from './ipc'

let pendingExePath: string | null = null

export function checkPendingExeFile(): string | null {
  const path = pendingExePath
  pendingExePath = null
  return path
}

function getCandidateGames(): GameInfo[] {
  const games: GameInfo[] = [
    ...sideloadLibraryStore.get('games', []),
    ...legendaryLibraryStore.get('library', []),
    ...gogLibraryStore.get('games', []),
    ...nileLibraryStore.get('library', []),
    ...zoomLibraryStore.get('games', [])
  ]

  return games.filter(
    (g) =>
      g.title &&
      !g.browserUrl &&
      !g.is_linux_native &&
      !g.is_mac_native &&
      g.install?.platform?.toLowerCase() !== 'linux'
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
  if (process.platform === 'win32') return // Hopefully this fixes the issue on windows

  if (exePath.startsWith('/run/user')) {
    dialog.showErrorBox(
      'No Access',
      `Cannot access "${exePath}" in the current sandbox.\nTry opening the file from a location Heroic has access to.`
    )
    return
  }

  logInfo(['Handling executable:', exePath], LogPrefix.Backend)

  if (!existsSync(exePath)) {
    dialog.showErrorBox('File Not Found', `"${exePath}" does not exist.`)
    return
  }

  const games = getCandidateGames()

  if (games.length === 0) {
    dialog.showErrorBox(
      'No Games Available',
      'No installed Windows games found.\nInstall a game in Heroic first to set up a Wine prefix.'
    )
    return
  }

  if (games.length === 1) {
    await launchExe(exePath, games[0].app_name)
    return
  }

  pendingExePath = exePath
  sendFrontendMessage('showExeFilePicker', exePath)
}
