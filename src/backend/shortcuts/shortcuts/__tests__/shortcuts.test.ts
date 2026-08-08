import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'
import type { Game } from 'common/types/game_manager'
import { addShortcuts } from '../shortcuts'

const mockUserHome = '/private/tmp/heroic-shortcuts-test'
const mockIconPath = join(mockUserHome, 'shortcut.png')

jest.mock('electron', () => ({
  app: {
    getPath: (path: string) => {
      if (path === 'exe') {
        return '/Applications/Heroic.app/Contents/MacOS/Heroic'
      }
      return `/private/tmp/${path}`
    }
  },
  nativeImage: {
    createFromBuffer: () => ({
      resize: () => ({ crop: () => ({ toPNG: () => Buffer.from('icon') }) })
    })
  },
  shell: { writeShortcutLink() {} }
}))

jest.mock('@shockpkg/icon-encoder', () => ({
  IconIcns: class {
    addFromPng() {}
    encode() {
      return Buffer.from('icon')
    }
  }
}))

jest.mock('backend/config', () => ({
  GlobalConfig: {
    get: () => ({
      getSettings: () => ({
        addDesktopShortcuts: false,
        addStartMenuShortcuts: true,
        addSteamShortcuts: false
      })
    })
  }
}))

jest.mock('backend/constants/environment', () => ({ isMac: true }))
jest.mock('backend/constants/paths', () => ({
  userHome: '/private/tmp/heroic-shortcuts-test'
}))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))
jest.mock('backend/storeManagers', () => ({ libraryManagerMap: {} }))
jest.mock('../../utils', () => ({
  getIcon: () => '/private/tmp/heroic-shortcuts-test/shortcut.png'
}))
jest.mock('../../nonesteamgame/nonesteamgame', () => ({
  addNonSteamGame: jest.fn()
}))

function makeGame(): Game {
  return {
    getGameInfo: () =>
      ({
        app_name: 'test-app',
        runner: 'sideload',
        title: 'Test Game',
        install: { is_dlc: false }
      }) as Game['getGameInfo'] extends () => infer T ? T : never
  } as Game
}

describe('macOS shortcuts', () => {
  const originalPlatform = process.platform
  const shortcutPath = join(
    mockUserHome,
    'Applications',
    'Test Game.app',
    'Contents',
    'MacOS',
    'run.sh'
  )

  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    rmSync(mockUserHome, { force: true, recursive: true })
    mkdirSync(mockUserHome, { recursive: true })
    writeFileSync(mockIconPath, 'icon')
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    rmSync(mockUserHome, { force: true, recursive: true })
  })

  test('quotes the generated launch URL as one shell argument', async () => {
    await addShortcuts(makeGame())

    expect(existsSync(shortcutPath)).toBe(true)
    expect(readFileSync(shortcutPath, 'utf8')).toContain(
      '--no-gui "heroic://launch?appName=test-app&runner=sideload"'
    )
  })
})
