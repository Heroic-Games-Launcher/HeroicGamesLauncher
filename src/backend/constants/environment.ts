import { env } from 'process'

export const isMac = process.platform === 'darwin'
export const isWindows = process.platform === 'win32'
export const isLinux = process.platform === 'linux'
export const isSteamDeckGameMode =
  process.env.XDG_CURRENT_DESKTOP === 'gamescope'
export const isCLIFullscreen = process.argv.includes('--fullscreen')
export const isCLINoGui = process.argv.includes('--no-gui')
export const isFlatpak = Boolean(env.FLATPAK_ID)
export const isSnap = Boolean(env.SNAP)
export const isAppImage = Boolean(env.APPIMAGE)
