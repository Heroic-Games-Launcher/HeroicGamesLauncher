// eslint-disable-next-line no-restricted-imports
import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { getMainWindow } from 'backend/main_window'
import { getGame } from './utils'
import { GameHandle } from 'frontend/helpers/ipc'
import { Game } from 'common/types/game_manager'

import type {
  AsyncIPCFunctions,
  SyncIPCFunctions,
  TestSyncIPCFunctions,
  FrontendEvent
} from 'common/types/ipc'

function applyTransform(valueBeforeTransform: unknown) {
  // Game -> GameHandle
  if (valueBeforeTransform instanceof Game) {
    return new GameHandle(valueBeforeTransform.id, valueBeforeTransform.runner)
  }
  return valueBeforeTransform
}

const isBrandedObj = <T>(thing: unknown, brand: string): thing is T =>
  typeof thing === 'object' &&
  thing !== null &&
  '_brand' in thing &&
  thing._brand === brand

function revertTransform(valueAfterTransform: unknown) {
  // NOTE: `instanceof` does not work here (since the object is cloned
  //       before we get it, and the prototype chain is not copied)
  // GameHandle -> Game
  if (isBrandedObj<GameHandle>(valueAfterTransform, 'GameHandle')) {
    return getGame(valueAfterTransform.id, valueAfterTransform.runner)
  }

  return valueAfterTransform
}

function addListener<ChannelName extends keyof SyncIPCFunctions>(
  channel: ChannelName,
  listener: (
    e: IpcMainEvent,
    ...args: Parameters<SyncIPCFunctions[ChannelName]>
  ) => void
) {
  ipcMain.on(channel, (e, ...args) =>
    listener(e, ...(args.map(revertTransform) as never))
  )
}

function addOneTimeListener<ChannelName extends keyof SyncIPCFunctions>(
  channel: ChannelName,
  listener: (
    e: IpcMainEvent,
    ...args: Parameters<SyncIPCFunctions[ChannelName]>
  ) => void
) {
  ipcMain.once(channel, (e, ...args) =>
    listener(e, ...(args.map(revertTransform) as never))
  )
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
    e: IpcMainInvokeEvent,
    ...args: Parameters<AsyncIPCFunctions[ChannelName]>
  ) =>
    | ReturnType<AsyncIPCFunctions[ChannelName]>
    | Awaited<ReturnType<AsyncIPCFunctions[ChannelName]>>
) {
  ipcMain.handle(channel, (e, ...args) =>
    applyTransform(handler(e, ...(args.map(revertTransform) as never)))
  )
}

/**
 * Sends a message to the main window's webContents if available
 * @returns Whether the message got sent
 */
function sendFrontendMessage<ChannelName extends keyof FrontendEvent>(
  channel: ChannelName,
  ...args: Parameters<FrontendEvent[ChannelName]>
): boolean {
  const mainWindow = getMainWindow()
  if (!mainWindow) return false

  mainWindow.webContents.send(channel, ...args.map(applyTransform))
  return true
}

export {
  addListener,
  addOneTimeListener,
  addTestOnlyListener,
  addHandler,
  sendFrontendMessage
}
