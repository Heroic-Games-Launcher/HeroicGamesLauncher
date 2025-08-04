import { makeListenerCaller, makeHandlerInvoker, frontendListenerSlot } from '../ipc'

export const toggleDXVK = makeHandlerInvoker('toggleDXVK')
export const toggleVKD3D = makeHandlerInvoker('toggleVKD3D')
export const toggleDXVKNVAPI = makeHandlerInvoker('toggleDXVKNVAPI')
export const isRuntimeInstalled = makeHandlerInvoker('isRuntimeInstalled')
export const downloadRuntime = makeHandlerInvoker('downloadRuntime')
export const showItemInFolder = makeListenerCaller('showItemInFolder')
export const installWineVersion = makeHandlerInvoker('installWineVersion')
export const removeWineVersion = makeHandlerInvoker('removeWineVersion')
export const refreshWineVersionInfo = makeHandlerInvoker('refreshWineVersionInfo')
export const handleProgressOfWinetricks = frontendListenerSlot('progressOfWinetricks')
export const handleProgressOfWineManager = frontendListenerSlot('progressOfWineManager')
export const handleWineVersionsUpdated = frontendListenerSlot('wineVersionsUpdated')
export const winetricksListInstalled = makeHandlerInvoker('winetricksInstalled')
export const winetricksListAvailable = makeHandlerInvoker('winetricksAvailable')
export const winetricksInstall = makeListenerCaller('winetricksInstall')
export const handleWinetricksInstalling = frontendListenerSlot('installing-winetricks-component')

export const wine = {
  isValidVersion: makeHandlerInvoker('wine.isValidVersion')
}
