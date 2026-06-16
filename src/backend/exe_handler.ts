import { BrowserWindow, dialog } from 'electron'
import { existsSync } from 'graceful-fs'
import { dirname } from 'path'
import { GameConfig } from './game_config'
import { runWineCommand } from './launcher'
import { libraryStore } from './storeManagers/sideload/electronStores'
import { logInfo, LogPrefix } from './logger'
import { windowIcon } from './constants/paths'
import { GameInfo } from 'common/types'

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

  logInfo(
    ['Launching', exePath, 'in prefix of', appName],
    LogPrefix.Backend
  )

  await runWineCommand({
    commandParts: [exePath],
    gameSettings: settings,
    wait: false,
    protonVerb: 'waitforexitandrun',
    startFolder: dirname(exePath)
  })
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;')
    .replaceAll('"', '&quot;')
}

function showPicker(exePath: string, games: GameInfo[]) {
  const pickerWindow = new BrowserWindow({
    width: 520,
    height: 460,
    title: 'Select Game Prefix',
    icon: windowIcon,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const gameRows = games
    .map(
      (g) =>
        `<button class="game-btn" onclick="pick('${g.app_name}')"><span class="game-icon">▶</span><span class="game-title">${escapeHtml(g.title)}</span></button>`
    )
    .join('')

  const exeEncoded = escapeHtml(exePath)
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600&family=Rubik:wght@500;600&display=swap');
  * { box-sizing: border-box; }
  body {
    font-family: 'Cabin', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0; padding: 24px 32px;
    background: #070a0b;
    color: #caf3fd;
    font-size: 14px;
  }
  h2 {
    font-family: 'Rubik', sans-serif;
    font-weight: 500;
    font-size: 16px;
    color: #caf3fd;
    margin: 0 0 4px 0;
  }
  .path {
    font-size: 12px;
    color: #51595a;
    margin-bottom: 16px;
    word-break: break-all;
    padding: 8px 12px;
    background: #161c1e;
    border-radius: 4px;
  }
  .list {
    max-height: 240px;
    overflow-y: auto;
    margin-bottom: 4px;
  }
  .list::-webkit-scrollbar { width: 6px; }
  .list::-webkit-scrollbar-track { background: transparent; }
  .list::-webkit-scrollbar-thumb { background: #272f31; border-radius: 3px; }
  .list::-webkit-scrollbar-thumb:hover { background: #51595a; }
  .game-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    margin-bottom: 4px;
    border: 1px solid #272f31;
    background: #161c1e;
    color: #caf3fd;
    text-align: left;
    border-radius: 4px;
    font-family: 'Cabin', sans-serif;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
  }
  .game-btn:hover { background: #272f31; border-color: #1de8f5; }
  .game-btn:active { background: #1de8f5; color: #070a0b; }
  .game-btn:active .game-icon { color: #070a0b; }
  .game-icon {
    font-size: 10px;
    color: #51595a;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }
  .game-title { flex: 1; }
  .cancel-btn {
    display: block;
    width: 100%;
    padding: 10px;
    margin-top: 8px;
    background: transparent;
    color: #51595a;
    border: none;
    text-align: center;
    font-family: 'Cabin', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 4px;
    transition: color 150ms;
  }
  .cancel-btn:hover { color: #f8ae79; }
</style>
</head>
<body>
<h2>Select a game to use as Wine prefix</h2>
<div class="path">${exeEncoded}</div>
<div class="list">${gameRows}</div>
<button class="cancel-btn" onclick="window.close()">Cancel</button>
<script>
function pick(appName) { window.location.href = 'game-picked://' + appName }
</script>
</body>
</html>`

  void pickerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

  pickerWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    const parsed = url.startsWith('game-picked://')
    if (parsed) {
      const appName = url.slice(14)
      pickerWindow.close()
      void launchExe(exePath, appName)
    }
  })
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

  showPicker(exePath, games)
}
