import { ipcRenderer } from 'electron'
import {
  DMQueueElement,
  InstallParams,
  UpdateParams,
  WineVersionInfo
} from './../../common/types'

export const installTool = async (args: WineVersionInfo) => {
  const dmQueueElement: DMQueueElement = {
    paramsTool: args,
    type: 'install',
    typeElement: 'tool',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }
  ipcRenderer.send('addToDMQueue', dmQueueElement)
}

export const installGame = async (args: InstallParams) => {
  const dmQueueElement: DMQueueElement = {
    paramsGame: args,
    type: 'install',
    typeElement: 'game',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }
  ipcRenderer.send('addToDMQueue', dmQueueElement)
}

export const updateGame = (args: UpdateParams) => {
  const {
    gameInfo: {
      install: { platform, install_path }
    }
  } = args

  const dmQueueElement: DMQueueElement = {
    paramsGame: { ...args, path: install_path!, platformToInstall: platform! },
    type: 'update',
    typeElement: 'game',
    addToQueueTime: Date.now(),
    endTime: 0,
    startTime: 0
  }

  ipcRenderer.send('addToDMQueue', dmQueueElement)
}

export const getDMQueueInformation = async () =>
  ipcRenderer.invoke('getDMQueueInformation')

export const removeFromDMQueue = (appName: string) =>
  ipcRenderer.send('removeFromDMQueue', appName)

export const clearDMFinished = () => ipcRenderer.send('clearDMFinished')

export const handleDMQueueInformation = (
  onChange: (e: Electron.IpcRendererEvent, elements: DMQueueElement[]) => void
) => {
  ipcRenderer.on('changedDMQueueInformation', onChange)
  return () => {
    ipcRenderer.removeListener('changedDMQueueInformation', onChange)
  }
}
