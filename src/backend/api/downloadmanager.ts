import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi,
  frontendListenerSlot as fls
} from 'common/ipc/frontend'

export const install = lc('install')

export const updateGame = lc('update')

export const getDMQueueInformation = hi('getDMQueueInformation')

export const removeFromDMQueue = lc('removeFromDMQueue')

export const handleDMQueueInformation = fls('changedDMQueueInformation')

export const cancelDownload = lc('cancelDownload')

export const resumeCurrentDownload = lc('resumeCurrentDownload')

export const pauseCurrentDownload = lc('pauseCurrentDownload')
