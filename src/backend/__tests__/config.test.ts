import { GlobalConfig } from 'backend/config'
import {
  configPath,
  defaultWinePrefix,
  getSteamCompatFolder,
  heroicInstallPath,
  setPlatformConstants
} from 'backend/constants'
import { existsSync, rmSync } from 'graceful-fs'

describe('GlobalConfig', () => {
  const sharedDefaults = {
    checkUpdatesInterval: 10,
    enableUpdates: false,
    addDesktopShortcuts: false,
    addStartMenuShortcuts: false,
    addSteamShortcuts: false,
    checkForUpdatesOnStartup: true,
    autoUpdateGames: false,
    framelessWindow: false,
    beforeLaunchScriptPath: '',
    afterLaunchScriptPath: '',
    verboseLogs: false,
    hideChangelogsOnStartup: false,
    language: 'en',
    maxWorkers: 0,
    minimizeOnLaunch: false,
    libraryTopSection: 'disabled'
  }

  const windowsDefaults = {
    wineVersion: {}
  }

  const macDefaults = {
    enableMsync: true,
    wineCrossoverBottle: 'Heroic'
  }

  const linuxDefaults = {
    autoInstallDxvk: true,
    autoInstallVkd3d: true,
    autoInstallDxvkNvapi: true,
    preferSystemLibs: false,
    customWinePaths: [],
    nvidiaPrime: false,
    enviromentOptions: [],
    wrapperOptions: [],
    showFps: false,
    useGameMode: false,
    defaultInstallPath: heroicInstallPath,
    defaultSteamPath: getSteamCompatFolder(),
    defaultWinePrefix: defaultWinePrefix,
    // winePrefix: '/home/<user>/Games/Heroic/Prefixes/default',
    // wineVersion: {
    //   bin: '/usr/bin/wine',
    //   name: 'Wine Default - wine-10.2 (Staging)',
    //   type: 'wine',
    //   wineserver: '/usr/bin/wineserver'
    // },
    enableEsync: true,
    enableFsync: true,
    eacRuntime: true,
    battlEyeRuntime: true,
    disableUMU: false
  }
  describe('getSettings', () => {
    describe('returns defaults if no settings yet', () => {
      const getSettings = () => {
        // clear global config so we initialize a new one
        if (existsSync(configPath)) rmSync(configPath)
        GlobalConfig['globalInstance'] = null as any

        return GlobalConfig.get().getSettings()
      }

      it('Linux defaults', () => {
        setPlatformConstants('linux')
        const settings = getSettings()
        expect(settings).toMatchObject(sharedDefaults)
        expect(settings).toMatchObject(linuxDefaults)
      })

      it('Windows defaults', () => {
        setPlatformConstants('win32')
        const settings = getSettings()
        expect(settings).toMatchObject(sharedDefaults)
        expect(settings).toMatchObject(windowsDefaults)
      })

      it('MacOS defaults', () => {
        setPlatformConstants('darwin')
        const settings = getSettings()
        expect(settings).toMatchObject(sharedDefaults)
        expect(settings).toMatchObject(macDefaults)
      })
    })
  })
})
