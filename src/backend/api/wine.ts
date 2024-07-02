import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi,
  frontendListenerSlot as fls
} from 'common/ipc/frontend'

export const toggleDXVK = hi('toggleDXVK')
export const toggleVKD3D = hi('toggleVKD3D')
export const toggleDXVKNVAPI = hi('toggleDXVKNVAPI')
export const isFlatpak = hi('isFlatpak')
export const isRuntimeInstalled = hi('isRuntimeInstalled')
export const downloadRuntime = hi('downloadRuntime')

export const showItemInFolder = lc('showItemInFolder')
export const installWineVersion = hi('installWineVersion')
export const removeWineVersion = hi('removeWineVersion')
export const refreshWineVersionInfo = hi('refreshWineVersionInfo')

export const handleProgressOfWinetricks = fls('progressOfWinetricks')

export const handleProgressOfWineManager = fls('progressOfWineManager')

export const handleWineVersionsUpdated = fls('wineVersionsUpdated')

export const winetricksListInstalled = hi('winetricksInstalled')

export const winetricksListAvailable = hi('winetricksAvailable')

export const winetricksInstall = lc('winetricksInstall')

export const handleWinetricksInstalling = fls('installing-winetricks-component')
