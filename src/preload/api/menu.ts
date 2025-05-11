import { ipcRenderer } from 'electron'
import { MoveGameArgs, Runner } from 'common/types'

export const removeShortcut = (appName: string, runner: Runner) =>
  ipcRenderer.send('removeShortcut', appName, runner)

export const addShortcut = (
  appName: string,
  runner: Runner,
  fromMenu: boolean
) => ipcRenderer.send('addShortcut', appName, runner, fromMenu)

export const moveInstall = async (args: MoveGameArgs) =>
  ipcRenderer.invoke('moveInstall', args)

export const changeInstallPath = async (args: MoveGameArgs) =>
  ipcRenderer.invoke('changeInstallPath', args)

export const enableEosOverlay = async (
  appName: string
): Promise<{ wasEnabled: boolean; installNow?: boolean }> =>
  ipcRenderer.invoke('enableEosOverlay', appName)

export const disableEosOverlay = async (appName: string) =>
  ipcRenderer.invoke('disableEosOverlay', appName)

export const isEosOverlayEnabled = async (appName?: string) =>
  ipcRenderer.invoke('isEosOverlayEnabled', appName)

export const installEosOverlay = async () =>
  ipcRenderer.invoke('installEosOverlay')

export const removeFromSteam = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('removeFromSteam', appName, runner)

export const addToSteam = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('addToSteam', appName, runner)

export const shortcutsExists = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('shortcutsExists', appName, runner)

export const isAddedToSteam = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('isAddedToSteam', appName, runner)
