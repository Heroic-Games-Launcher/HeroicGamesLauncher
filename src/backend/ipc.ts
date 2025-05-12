// eslint-disable-next-line no-restricted-imports
import { ipcMain, type IpcMainEvent } from 'electron'
import { getMainWindow } from 'backend/main_window'

import type {
  AsyncIPCFunctions,
  SyncIPCFunctions,
  TestSyncIPCFunctions,
  FrontendMessages
} from 'common/types/ipc'

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

function addTestOnlyListener<ChannelName extends keyof TestSyncIPCFunctions>(
  channel: ChannelName,
  listener: (...args: Parameters<TestSyncIPCFunctions[ChannelName]>) => void
) {
  if (process.env.CI === 'e2e') ipcMain.on(channel, listener as never)
}

function addHandler<ChannelName extends keyof AsyncIPCFunctions>(
  channel: ChannelName,
  handler: (
    e: IpcMainEvent,
    ...args: Parameters<AsyncIPCFunctions[ChannelName]>
  ) =>
    | ReturnType<AsyncIPCFunctions[ChannelName]>
    | Awaited<ReturnType<AsyncIPCFunctions[ChannelName]>>
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
  const mainWindow = getMainWindow()
  if (!mainWindow) return false

  mainWindow.webContents.send(channel, ...args)
  return true
}

export {
  addListener,
  addOneTimeListener,
  addTestOnlyListener,
  addHandler,
  sendFrontendMessage
}
