type AnyFunction = (...args: never[]) => unknown

const noop = () => undefined
const unsubscribe = () => noop

const isListenerSlot = (name: string) =>
  /^(handle|on)[A-Z]/.test(name) || name === 'onConnectivityChanged'

const defaults: Record<string, unknown> = {
  storeNew: noop,
  storeHas: () => false,
  storeGet: (...args: never[]) => args[2],
  storeSet: noop,
  storeDelete: noop,
  getCustomCSS: () => Promise.resolve(''),
  getThemeCSS: () => Promise.resolve(''),
  getCustomThemes: () => Promise.resolve([]),
  requestAppSettings: () => Promise.resolve({}),
  requestGameSettings: () => Promise.resolve({}),
  openDialog: () => Promise.resolve(''),
  getHeroicVersion: () => Promise.resolve('0.0.0-storybook'),
  getLatestReleases: () => Promise.resolve([]),
  getCurrentChangelog: () => Promise.resolve(null),
  isFullscreen: () => Promise.resolve(false),
  isFrameless: () => Promise.resolve(false),
  isMaximized: () => Promise.resolve(false),
  isMinimized: () => Promise.resolve(false),
  isNative: () => Promise.resolve(true),
  getCustomCategories: () => Promise.resolve({}),
  getUploadedLogFiles: () => Promise.resolve({}),
  getWikiGameInfo: () => Promise.resolve(null),
  getAnticheatInfo: () => Promise.resolve(null),
  getGameInfo: () => Promise.resolve(null),
  getExtraInfo: () => Promise.resolve(null),
  getInstallInfo: () => Promise.resolve(null),
  getDMQueueInformation: () => Promise.resolve({ elements: [], finished: [] }),
  checkDiskSpace: () =>
    Promise.resolve({
      free: 128 * 1024 ** 3,
      diskSize: 512 * 1024 ** 3,
      message: '',
      validPath: true,
      validFlatpakPath: true
    }),
  getAlternativeWine: () => Promise.resolve([]),
  getWineVersions: () => Promise.resolve([]),
  getShellPath: () => Promise.resolve(''),
  getDefaultSavePath: () => Promise.resolve(''),
  getFonts: () => Promise.resolve([]),
  getSteamUserdataDir: () => Promise.resolve(''),
  getPlaytimeFromRunner: () => Promise.resolve(0),
  gamepadAction: () => Promise.resolve(),
  readFile: () => Promise.resolve(''),
  winetricksListInstalled: () => Promise.resolve([]),
  winetricksListAvailable: () => Promise.resolve([]),
  steamgriddb: {
    hasApiKey: () => Promise.resolve(false),
    setApiKey: () => Promise.resolve(),
    searchGame: () => Promise.resolve([]),
    getGrids: () => Promise.resolve([]),
    getHeroes: () => Promise.resolve([])
  },
  systemInfo: {
    get: () => Promise.resolve(null),
    copyToClipboard: noop
  },
  wine: {
    isValidVersion: () => Promise.resolve(true)
  }
}

const overrides: Record<string, unknown> = { ...defaults }

const generated = new Map<string, AnyFunction>()

const api = new Proxy({} as Record<string | symbol, unknown>, {
  get(_target, property) {
    if (typeof property !== 'string') return undefined
    if (property in overrides) return overrides[property]

    let stub = generated.get(property)
    if (!stub) {
      stub = isListenerSlot(property) ? unsubscribe : () => Promise.resolve()
      generated.set(property, stub)
    }
    return stub
  },
  set(_target, property, value) {
    if (typeof property !== 'string') return false
    overrides[property] = value
    return true
  },
  deleteProperty(_target, property) {
    if (typeof property !== 'string') return true
    if (property in defaults) {
      overrides[property] = defaults[property]
    } else {
      delete overrides[property]
    }
    return true
  }
})

export function installElectronApiMock() {
  const target = window as unknown as Record<string, unknown>

  target.api = api
  target.isSteamDeck = false
  target.isSteamDeckGameMode = false
  target.isFlatpak = false
  target.isE2ETesting = false
  target.platform = 'linux'
  target.setCustomCSS = noop
  target.setTheme = noop
  target.imageData = () => Promise.resolve('')
}

installElectronApiMock()
