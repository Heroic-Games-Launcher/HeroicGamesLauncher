import { ipcRenderer } from 'electron'
import { DMQueueElement, InstallParams, UpdateParams } from 'common/types'

export const install = async (args: InstallParams) => {
  const dmQueueElement: DMQueueElement = {
    params: args,
    type: 'install',
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
    params: { ...args, path: install_path!, platformToInstall: platform! },
    type: 'update',
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

export const handleDMQueueInformation = (
  onChange: (e: Electron.IpcRendererEvent, elements: DMQueueElement[]) => void
) => {
  ipcRenderer.on('changedDMQueueInformation', onChange)
  return () => {
    ipcRenderer.removeListener('changedDMQueueInformation', onChange)
  }
}
