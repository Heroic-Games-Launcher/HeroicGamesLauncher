import { ipcRenderer } from 'electron'
import { Runner } from '../../common/types'

//src/frontend/screens/game/gamesubmenu
export const removeShortcut = (appName: string, runner: Runner) =>
  ipcRenderer.send('removeShortcut', appName, runner)
export const addShortcut = (
  appName: string,
  runner: Runner,
  fromMenu: boolean
) => ipcRenderer.send('addShortcut', appName, runner, fromMenu)
export const moveInstall = async (
  args: [appName: string, path: string, runner: Runner]
) => ipcRenderer.invoke('moveInstall', args)
export const changeInstallPath = async (
  args: [appName: string, path: string, runner: Runner]
) => ipcRenderer.invoke('changeInstallPath', args)
export const disableEosOverlay = async (appName: string) =>
  ipcRenderer.invoke('disableEosOverlay', appName)
export const enableEosOverlay = async (appName: string) =>
  ipcRenderer.invoke('enableEosOverlay', appName)
export const installEosOverlay = async () =>
  ipcRenderer.invoke('installEosOverlay')
export const removeFromSteam = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('removeFromSteam', appName, runner)
export const addToSteam = async (
  appName: string,
  runner: Runner,
  bkgDataURL: string,
  bigPicDataURL: string
) =>
  ipcRenderer.invoke('addToSteam', appName, runner, bkgDataURL, bigPicDataURL)
export const shortcutsExists = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('shortcutsExists', appName, runner)
export const isAddedToSteam = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('isAddedToSteam', appName, runner)
export const isEosOverlayEnabled = async (appName?: string) =>
  ipcRenderer.invoke('isEosOverlayEnabled', appName)
