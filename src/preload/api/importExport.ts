import { frontendListenerSlot, makeHandlerInvoker } from '../ipc'

export const getHomeDir = makeHandlerInvoker('getHomeDir')
export const getWineImportProgress = makeHandlerInvoker('getWineImportProgress')
export const exportHeroicBackup = makeHandlerInvoker('exportHeroicBackup')
export const validateHeroicBackup = makeHandlerInvoker('validateHeroicBackup')
export const applyHeroicBackup = makeHandlerInvoker('applyHeroicBackup')
export const getRollbackSnapshot = makeHandlerInvoker('getRollbackSnapshot')
export const rollbackHeroicBackup = makeHandlerInvoker('rollbackHeroicBackup')
export const restartHeroic = makeHandlerInvoker('restartHeroic')

export const onWineImportProgress = frontendListenerSlot('wineImportProgress')
