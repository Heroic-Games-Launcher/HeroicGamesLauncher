import { ipcRenderer } from 'electron'
import { MoveGameArgs, Runner } from 'common/types'

export const removeShortcut = (appName: string, runner: Runner) =>
  ipcRenderer.send('removeShortcut', appName, runner)

export const addShortcut = (
  appName: string,
  runner: Runner,
  fromMenu: boolean
) => ipcRenderer.send('addShortcut', appName, runner, fromMenu)

export const moveInstall = async (
  args: MoveGameArgs
): Promise<{ status: 'done' | 'error' }> =>
  ipcRenderer.invoke('moveInstall', args)

export const changeInstallPath = async (args: MoveGameArgs): Promise<void> =>
  ipcRenderer.invoke('changeInstallPath', args)

export const enableEosOverlay = async (
  appName: string
): Promise<{ wasEnabled: boolean; installNow?: boolean }> =>
  ipcRenderer.invoke('enableEosOverlay', appName)

export const disableEosOverlay = async (appName: string): Promise<void> =>
  ipcRenderer.invoke('disableEosOverlay', appName)

export const isEosOverlayEnabled = async (appName?: string): Promise<boolean> =>
  ipcRenderer.invoke('isEosOverlayEnabled', appName)

export const installEosOverlay = async (): Promise<string | undefined> =>
  ipcRenderer.invoke('installEosOverlay')

export const removeFromSteam = async (
  appName: string,
  runner: Runner
): Promise<void> => ipcRenderer.invoke('removeFromSteam', appName, runner)

export const addToSteam = async (
  appName: string,
  runner: Runner,
  bkgDataURL: string,
  bigPicDataURL: string
): Promise<boolean> =>
  ipcRenderer.invoke('addToSteam', appName, runner, bkgDataURL, bigPicDataURL)

export const shortcutsExists = async (
  appName: string,
  runner: Runner
): Promise<boolean> => ipcRenderer.invoke('shortcutsExists', appName, runner)

export const isAddedToSteam = async (
  appName: string,
  runner: Runner
): Promise<boolean> => ipcRenderer.invoke('isAddedToSteam', appName, runner)
