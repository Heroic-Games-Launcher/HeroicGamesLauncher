import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { logError, logInfo, logWarning, LogPrefix } from 'backend/logger'
import { execAsync } from 'backend/utils'
import { userHome } from 'backend/constants/paths'
import { isFlatpak, isLinux, isSnap } from 'backend/constants/environment'

/**
 * Fallback used when Steam is running but the SteamClient debugging
 * interface is not available: the running client exposes the
 * `steam://addnonsteamgame/<encoded-path>` url handler, which adds a
 * shortcut without a Steam restart. The handler does not allow setting
 * a title or launch options, so a persistent .desktop wrapper is
 * created and added instead, the same approach used by
 * https://github.com/GloriousEggroll/steam-add-nonsteam-game
 */

const wrapperDir = join(
  userHome,
  '.local/share/applications/heroic-steam-shortcuts'
)

function steamShortcutWrapperPath(gameInfo: {
  app_name: string
  runner: string
}): string {
  return join(wrapperDir, `${gameInfo.runner}-${gameInfo.app_name}.desktop`)
}

function escapeDesktopValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * Adds a non-steam game to a running Steam client via the
 * steam://addnonsteamgame url handler. Only usable outside of
 * sandboxes, since the sentinel file and the steam binary live on the
 * host.
 * @returns true if the url was handed to Steam
 */
async function addNonSteamGameViaUrlHandler(props: {
  gameInfo: { app_name: string; runner: string; title: string }
  exe: string
  startDir: string
  launchOptions: string
  icon?: string
}): Promise<boolean> {
  if (!isLinux || isFlatpak || isSnap) {
    return false
  }

  try {
    const wrapperFile = steamShortcutWrapperPath(props.gameInfo)
    if (!existsSync(wrapperDir)) {
      mkdirSync(wrapperDir, { recursive: true })
    }

    const iconLine = props.icon
      ? `Icon=${escapeDesktopValue(props.icon)}\n`
      : ''
    const content =
      '[Desktop Entry]\n' +
      'Type=Application\n' +
      `Name=${escapeDesktopValue(props.gameInfo.title)}\n` +
      `Exec=${props.exe} ${props.launchOptions}\n` +
      `Path=${escapeDesktopValue(props.startDir.replaceAll('"', ''))}\n` +
      iconLine +
      'Terminal=false\n' +
      'NoDisplay=true\n'
    writeFileSync(wrapperFile, content)

    // Steam's url handler only accepts local paths while this
    // sentinel file exists
    writeFileSync(join(tmpdir(), 'addnonsteamgamefile'), '')

    const url = `steam://addnonsteamgame/${encodeURIComponent(wrapperFile)}`
    await execAsync(`steam ${url}`, { timeout: 15000 })

    logInfo(
      `Added ${props.gameInfo.title} to Steam via the addnonsteamgame url handler.`,
      LogPrefix.Shortcuts
    )
    return true
  } catch (error) {
    logError(
      [
        `Failed to add ${props.gameInfo.title} to Steam via the url handler with:`,
        error
      ],
      LogPrefix.Shortcuts
    )
    return false
  }
}

function removeSteamShortcutWrapper(gameInfo: {
  app_name: string
  runner: string
}) {
  const wrapperFile = steamShortcutWrapperPath(gameInfo)
  if (!existsSync(wrapperFile)) {
    return
  }
  try {
    unlinkSync(wrapperFile)
  } catch (error) {
    logWarning(
      [`Failed to remove ${wrapperFile} with:`, error],
      LogPrefix.Shortcuts
    )
  }
}

export {
  addNonSteamGameViaUrlHandler,
  removeSteamShortcutWrapper,
  steamShortcutWrapperPath
}
