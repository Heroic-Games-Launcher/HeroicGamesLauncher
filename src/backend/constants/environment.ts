import { env } from 'process'
import { cpus } from 'os'
import { readFileSync } from 'graceful-fs'

interface Manifest {
  'runtime-version': string
}

function readFlatpakRuntimeVersion() {
  try {
    const flatpakInfo = readFileSync('/.flatpak-info', 'utf8')
    const runtime = flatpakInfo
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('runtime='))
      ?.slice('runtime='.length)
      .split('/')
      .pop()
    if (runtime) return runtime
  } catch (error) {
    console.log(`Unable to read runtime version from /.flatpak-info. ${error}`)
  }

  try {
    const manifestContent = readFileSync('/app/manifest.json', 'utf8')
    const manifest = JSON.parse(manifestContent) as Manifest
    if (manifest['runtime-version']) return manifest['runtime-version']
  } catch (error) {
    console.log(
      `Unable to read runtime version from flatpak manifest file. ${error}`
    )
  }

  return 'unknown'
}

export const isMac = process.platform === 'darwin'
export const isIntelMac = isMac && cpus()[0].model.includes('Intel') // so we can have different behavior for Intel Mac
export const isWindows = process.platform === 'win32'
export const isLinux = process.platform === 'linux'
export const isSteamDeckGameMode =
  process.env.XDG_CURRENT_DESKTOP === 'gamescope'
const isSteamDeckDesktopMode =
  env.SESSION_MANAGER?.includes('unix/steamdeck') &&
  env.HOME === '/home/deck' &&
  env.DESKTOP_SESSION?.includes('steamos')
export const isSteamDeck = isSteamDeckGameMode || isSteamDeckDesktopMode

function readSteamOsId(): string | null {
  for (const potPath of ['/run/host/os-release', '/etc/os-release']) {
    try {
      const content = readFileSync(potPath, 'utf-8')
      const match = content.match(/^ID=(.*)/m)
      if (match) {
        const value = match[1].trim()
        return value.startsWith('"') && value.endsWith('"')
          ? value.slice(1, -1)
          : value
      }
    } catch {
      // Ignore missing/unreadable os-release files.
    }
  }
  return null
}

// SteamOS covers Steam Deck and Steam Machine (game and desktop modes).
export const isSteamOS =
  isSteamDeck || isSteamDeckGameMode || readSteamOsId() === 'steamos'
export const isCLIFullscreen = process.argv.includes('--fullscreen')
export const isCLINoGui = process.argv.includes('--no-gui')
export const isCLIConsoleMode = process.argv.includes('--console')
export const isFlatpak = Boolean(env.FLATPAK_ID)
export const isAppImage = Boolean(env.APPIMAGE)
export const flatpakRuntimeVersion = isFlatpak
  ? readFlatpakRuntimeVersion()
  : ''
export const autoUpdateSupported = isWindows || isMac || isAppImage
