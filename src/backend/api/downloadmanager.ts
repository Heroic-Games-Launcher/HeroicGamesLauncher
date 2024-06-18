import {
  DownloadManagerState,
  Runner,
  DMQueueElement,
  InstallParams,
  UpdateParams
} from 'common/types'
import { ipcRenderer } from 'electron'

export const install = async (args: InstallParams) => {
  const dmQueueElement: DMQueueElement = {
    params: args,
    type: 'install',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  ipcRenderer.invoke('addToDMQueue', dmQueueElement)

  // Add Dlcs to the queue
  if (
    Array.isArray(args.installDlcs) &&
    args.installDlcs.length > 0 &&
    args.runner === 'legendary'
  ) {
    args.installDlcs.forEach(async (dlc) => {
      const dlcArgs: InstallParams = {
        ...args,
        appName: dlc
      }
      const dlcQueueElement: DMQueueElement = {
        params: dlcArgs,
        type: 'install',
        addToQueueTime: Date.now(),
        endTime: 0,
        startTime: 0
      }
      ipcRenderer.invoke('addToDMQueue', dlcQueueElement)
    })
  }
}

export const updateGame = (args: UpdateParams) => {
  const {
    gameInfo: {
      install: { platform, install_path }
    }
  } = args

  const dmQueueElement: DMQueueElement = {
    params: { ...args, path: install_path!, platformToInstall: platform! },
    type: 'update',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  ipcRenderer.invoke('addToDMQueue', dmQueueElement)
}

export const getDMQueueInformation = async () =>
  ipcRenderer.invoke('getDMQueueInformation')

export const removeFromDMQueue = (appName: string, runner: Runner) =>
  ipcRenderer.send('removeFromDMQueue', appName, runner)

export const handleDMQueueInformation = (
  onChange: (
    e: Electron.IpcRendererEvent,
    elements: DMQueueElement[],
    state: DownloadManagerState
  ) => void
) => {
  ipcRenderer.on('changedDMQueueInformation', onChange)
  return () => {
    ipcRenderer.removeListener('changedDMQueueInformation', onChange)
  }
}

export const cancelDownload = (removeDownloaded: boolean) =>
  ipcRenderer.send('cancelDownload', removeDownloaded)

export const resumeCurrentDownload = () =>
  ipcRenderer.send('resumeCurrentDownload')

export const pauseCurrentDownload = () =>
  ipcRenderer.send('pauseCurrentDownload')
