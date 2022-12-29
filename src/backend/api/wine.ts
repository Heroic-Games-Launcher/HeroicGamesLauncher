import { ipcRenderer } from 'electron'
import {
  Runner,
  RuntimeName,
  WineVersionInfo,
  ProgressInfo,
  State
} from 'common/types'
import {
  Workaround,
  InstallParams,
  RemoveParams,
  IsInstalledParams,
  UpdateParams
} from './../wine/workarounds/types'

export const installWorkaround = async <T extends Workaround>(
  workaround: T,
  appName: string,
  runner: Runner,
  ...args: InstallParams<T>
) =>
  ipcRenderer.invoke(
    'installWorkaround',
    workaround,
    appName,
    runner,
    ...(args as [never])
  )
export const removeWorkaround = async <T extends Workaround>(
  workaround: T,
  appName: string,
  runner: Runner,
  ...args: RemoveParams<T>
) =>
  ipcRenderer.invoke(
    'removeWorkaround',
    workaround,
    appName,
    runner,
    ...(args as [])
  )
export const updateWorkaround = async <T extends Workaround>(
  workaround: T,
  appName: string,
  runner: Runner,
  ...args: UpdateParams<T>
) =>
  ipcRenderer.invoke(
    'updateWorkaround',
    workaround,
    appName,
    runner,
    ...(args as [never])
  )
export const isWorkaroundInstalled = async <T extends Workaround>(
  workaround: T,
  appName: string,
  runner: Runner,
  ...args: IsInstalledParams<T>
) =>
  ipcRenderer.invoke(
    'isWorkaroundInstalled',
    workaround,
    appName,
    runner,
    ...(args as [])
  )

export const hasValidPrefix = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('hasValidPrefix', appName, runner)

export const isFlatpak = async (): Promise<boolean> =>
  ipcRenderer.invoke('isFlatpak')
export const isRuntimeInstalled = async (
  runtime_name: RuntimeName
): Promise<boolean> => ipcRenderer.invoke('isRuntimeInstalled', runtime_name)
export const downloadRuntime = async (
  runtime_name: RuntimeName
): Promise<boolean> => ipcRenderer.invoke('downloadRuntime', runtime_name)

export const showItemInFolder = (installDir: string) =>
  ipcRenderer.send('showItemInFolder', installDir)
export const installWineVersion = async (
  release: WineVersionInfo
): Promise<'error' | 'abort' | 'success'> =>
  ipcRenderer.invoke('installWineVersion', release)
export const removeWineVersion = async (
  release: WineVersionInfo
): Promise<boolean> => ipcRenderer.invoke('removeWineVersion', release)
export const refreshWineVersionInfo = async (fetch?: boolean): Promise<void> =>
  ipcRenderer.invoke('refreshWineVersionInfo', fetch)

export const handleProgressOfWinetricks = (
  onProgress: (e: Electron.IpcRendererEvent, messages: string[]) => void
): (() => void) => {
  ipcRenderer.on('progressOfWinetricks', onProgress)
  return () => {
    ipcRenderer.removeListener('progressOfWinetricks', onProgress)
  }
}

export const handleProgressOfWineManager = (
  version: string,
  callback: (
    e: Electron.IpcRendererEvent,
    progress: {
      state: State
      progress: ProgressInfo
    }
  ) => void
): (() => void) => {
  ipcRenderer.on('progressOfWineManager' + version, callback)
  return () => {
    ipcRenderer.removeListener('progressOfWineManager' + version, callback)
  }
}

export const handleWineVersionsUpdated = (
  callback: () => void
): (() => void) => {
  ipcRenderer.on('wineVersionsUpdated', callback)
  return () => {
    ipcRenderer.removeListener('wineVersionsUpdated', callback)
  }
}
