import { makeListenerCaller, makeHandlerInvoker, frontendListenerSlot } from '../ipc'

export const install = makeHandlerInvoker('install')
export const updateGame = makeHandlerInvoker('updateGame')
export const getDMQueueInformation = makeHandlerInvoker('getDMQueueInformation')
export const removeFromDMQueue = makeListenerCaller('removeFromDMQueue')
export const handleDMQueueInformation = frontendListenerSlot('changedDMQueueInformation')
export const cancelDownload = makeListenerCaller('cancelDownload')
export const resumeCurrentDownload = makeListenerCaller('resumeCurrentDownload')
export const pauseCurrentDownload = makeListenerCaller('pauseCurrentDownload')
