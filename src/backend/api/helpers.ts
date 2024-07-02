import {
  makeListenerCaller as lc,
  makeHandlerInvoker as hi,
  frontendListenerSlot as fls
} from 'common/ipc/frontend'

export const notify = lc('notify')
export const openLoginPage = lc('openLoginPage')
export const openSidInfoPage = lc('openSidInfoPage')
export const openSupportPage = lc('openSupportPage')
export const quit = lc('quit')
export const showAboutWindow = lc('showAboutWindow')
export const openDiscordLink = lc('openDiscordLink')
export const openWinePrefixFAQ = lc('openWinePrefixFAQ')
export const openCustomThemesWiki = lc('openCustomThemesWiki')
export const createNewWindow = lc('createNewWindow')

export const readConfig = hi('readConfig')

export const isLoggedIn = hi('isLoggedIn')

export const writeConfig = hi('writeConfig')

export const kill = hi('kill')

export const abort = lc('abort')

export const getUserInfo = hi('getUserInfo')

export const getAmazonUserInfo = hi('getAmazonUserInfo')

export const syncSaves = hi('syncSaves')

export const getDefaultSavePath = hi('getDefaultSavePath')
export const getGameInfo = hi('getGameInfo')
export const getExtraInfo = hi('getExtraInfo')

export const getLaunchOptions = hi('getLaunchOptions')

export const getPrivateBranchPassword = hi('getPrivateBranchPassword')
export const setPrivateBranchPassword = hi('setPrivateBranchPassword')

// REDmod integration
export const getAvailableCyberpunkMods = hi('getAvailableCyberpunkMods')
export const setCyberpunModConfig = hi('setCyberpunkModConfig')

export const getGameSettings = hi('getGameSettings')

export const getInstallInfo = hi('getInstallInfo')

export const runWineCommand = hi('runWineCommand')

export const runWineCommandForGame = hi('runWineCommandForGame')

export const onConnectivityChanged = fls('connectivity-changed')

export const getConnectivityStatus = hi('get-connectivity-status')

export const setConnectivityOnline = lc('set-connectivity-online')

export const connectivityChanged = lc('connectivity-changed')

export const isNative = hi('isNative')

export const getThemeCSS = hi('getThemeCSS')

export const getCustomThemes = hi('getCustomThemes')

export const setTitleBarOverlay = lc('setTitleBarOverlay')

export const isGameAvailable = hi('isGameAvailable')
