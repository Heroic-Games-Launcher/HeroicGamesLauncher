// eslint-disable-next-line no-restricted-imports
import { ipcRenderer, type IpcRendererEvent } from 'electron'

import type { AsyncIPCFunctions, SyncIPCFunctions, FrontendEvent, ParameterMappings } from 'common/types/ipc'

type Lookup<Mapping, T> = Mapping extends infer M ? (M extends [infer K, infer U] ? (T extends K ? U : T) : T) : T

type BackendToFrontendTransform<T> = Lookup<ParameterMappings, T>

type BackendToFrontendTransformArr<Params extends unknown[]> = {
  [K in keyof Params]: BackendToFrontendTransform<Params[K]>
}

// Creates a Promise<T> only if T isn't already a promise
type PromiseOnce<T> = T extends Promise<unknown> ? T : Promise<T>

// Returns a function calling an IPC listener created by the backend, accepting that listeners parameters
function makeListenerCaller<ChannelName extends keyof SyncIPCFunctions>(channel: ChannelName) {
  return (...args: BackendToFrontendTransformArr<Parameters<SyncIPCFunctions[ChannelName]>>) =>
    ipcRenderer.send(channel, ...args)
}

// Like `makeListenerCaller`, but for IPC handlers instead
function makeHandlerInvoker<ChannelName extends keyof AsyncIPCFunctions>(channel: ChannelName) {
  return (...args: BackendToFrontendTransformArr<Parameters<AsyncIPCFunctions[ChannelName]>>) =>
    ipcRenderer.invoke(channel, ...args) as BackendToFrontendTransform<
      PromiseOnce<ReturnType<AsyncIPCFunctions[ChannelName]>>
    >
}

// Returns a function the Frontend can call to add a listener to this channel
function frontendListenerSlot<ChannelName extends keyof FrontendEvent>(channel: ChannelName) {
  return (listener: (...args: BackendToFrontendTransformArr<Parameters<FrontendEvent[ChannelName]>>) => void) => {
    const wrapper: (e: IpcRendererEvent, ...args: unknown[]) => void = (e, ...args) =>
      listener(...(args as BackendToFrontendTransformArr<Parameters<FrontendEvent[ChannelName]>>))

    ipcRenderer.on(channel, wrapper)

    return () => {
      ipcRenderer.removeListener(channel, wrapper)
    }
  }
}

export { makeListenerCaller, makeHandlerInvoker, frontendListenerSlot }
