import { env } from 'process'
import { cpus } from 'os'
import { readFileSync } from 'graceful-fs'

interface Manifest {
  'runtime-version': string
}

function readFlatpakRuntimeVersion() {
  try {
    const manifestContent = readFileSync('/app/manifest.json', 'utf8')
    const manifest = JSON.parse(manifestContent) as Manifest
    return manifest['runtime-version']
  } catch (error) {
    console.log(
      `Unable to read runtime version from Flatpak manifest file. ${error}`
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
export const isCLIFullscreen = process.argv.includes('--fullscreen')
export const isCLINoGui = process.argv.includes('--no-gui')
export const isFlatpak = Boolean(env.FLATPAK_ID)
export const isSnap = Boolean(env.SNAP)
export const isAppImage = Boolean(env.APPIMAGE)
export const flatpakRuntimeVersion = isFlatpak
  ? readFlatpakRuntimeVersion()
  : ''
export const autoUpdateSupported = isWindows || isMac || isAppImage
