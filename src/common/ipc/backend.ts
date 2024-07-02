// eslint-disable-next-line no-restricted-imports
import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron'
import { getMainWindow } from 'backend/main_window'

import type {
  AsyncIPCFunctions,
  SyncIPCFunctions,
  FrontendMessages
} from './types'

function addListener<ChannelName extends keyof SyncIPCFunctions>(
  channel: ChannelName,
  listener: (
    e: IpcMainEvent,
    ...args: Parameters<SyncIPCFunctions[ChannelName]>
  ) => void
) {
  ipcMain.on(channel, listener as never)
}

function addOneTimeListener<ChannelName extends keyof SyncIPCFunctions>(
  channel: ChannelName,
  listener: (
    e: IpcMainEvent,
    ...args: Parameters<SyncIPCFunctions[ChannelName]>
  ) => void
) {
  ipcMain.once(channel, listener as never)
}

function addHandler<ChannelName extends keyof AsyncIPCFunctions>(
  channel: ChannelName,
  handler: (
    e: IpcMainEvent,
    ...args: Parameters<AsyncIPCFunctions[ChannelName]>
  ) => ReturnType<AsyncIPCFunctions[ChannelName]>
) {
  ipcMain.handle(channel, handler as never)
}

/**
 * Sends a message to the main window's webContents if available
 * @returns Whether the message got sent
 */
function sendFrontendMessage<ChannelName extends keyof FrontendMessages>(
  channel: ChannelName,
  ...args: Parameters<FrontendMessages[ChannelName]>
): boolean {
  let mainWindow: BrowserWindow | null | undefined = getMainWindow()

  if (!mainWindow) mainWindow = BrowserWindow.getAllWindows().at(0)

  if (!mainWindow) return false

  mainWindow.webContents.send(channel, ...args)
  return true
}

export { addListener, addOneTimeListener, addHandler, sendFrontendMessage }
