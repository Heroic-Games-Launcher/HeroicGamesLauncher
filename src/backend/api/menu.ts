import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi
} from 'common/ipc/frontend'

export const removeShortcut = lc('removeShortcut')

export const addShortcut = lc('addShortcut')

export const moveInstall = hi('moveInstall')

export const changeInstallPath = hi('changeInstallPath')

export const enableEosOverlay = hi('enableEosOverlay')

export const disableEosOverlay = hi('disableEosOverlay')

export const isEosOverlayEnabled = hi('isEosOverlayEnabled')

export const installEosOverlay = hi('installEosOverlay')

export const removeFromSteam = hi('removeFromSteam')

export const addToSteam = hi('addToSteam')

export const shortcutsExists = hi('shortcutsExists')

export const isAddedToSteam = hi('isAddedToSteam')
