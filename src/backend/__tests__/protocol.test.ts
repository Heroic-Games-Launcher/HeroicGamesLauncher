// Mock environment constants first, before any imports
const mockIsCLINoGui = jest.fn()
jest.mock('../constants/environment', () => ({
  get isCLINoGui() {
    return mockIsCLINoGui()
  },
  isSnap: false
}))

// Mock paths to avoid XDG_CONFIG_HOME issues
jest.mock('../constants/paths', () => ({
  windowIcon: 'mock-icon-path',
  appFolder: '/mock/app/folder',
  userHome: '/mock/home'
}))

import { handleProtocol } from '../protocol'
import { app, dialog } from 'electron'
import { gameManagerMap } from '../storeManagers'
import { getMainWindow } from '../main_window'
import { sendFrontendMessage } from '../ipc'
import { addToQueue } from '../downloadmanager/downloadqueue'
import { uninstallGameCallback } from '../utils/uninstaller'

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    quit: jest.fn()
  },
  dialog: {
    showMessageBox: jest.fn()
  }
}))

// Mock other dependencies
jest.mock('../main_window', () => ({
  getMainWindow: jest.fn()
}))

jest.mock('../ipc', () => ({
  sendFrontendMessage: jest.fn()
}))

jest.mock('../downloadmanager/downloadqueue', () => ({
  addToQueue: jest.fn()
}))

jest.mock('../config', () => ({
  GlobalConfig: {
    get: () => ({
      getSettings: () => ({
        defaultInstallPath: '/default/install/path'
      })
    })
  }
}))

jest.mock('../utils/uninstaller', () => ({
  uninstallGameCallback: jest.fn()
}))

jest.mock('../dialog/dialog', () => ({
  notify: jest.fn()
}))

jest.mock('../storeManagers', () => ({
  gameManagerMap: {
    legendary: {
      getGameInfo: jest.fn(),
      getSettings: jest.fn()
    },
    gog: {
      getGameInfo: jest.fn(),
      getSettings: jest.fn()
    },
    nile: {
      getGameInfo: jest.fn(),
      getSettings: jest.fn()
    },
    sideload: {
      getGameInfo: jest.fn(),
      getSettings: jest.fn()
    }
  }
}))

jest.mock('../logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  LogPrefix: {
    ProtocolHandler: 'ProtocolHandler'
  }
}))

// Mock i18next
jest.mock('i18next', () => ({
  t: jest.fn((key: string, fallback?: string) => fallback || key)
}))

// Mock launcher
jest.mock('../launcher', () => ({
  launchEventCallback: jest.fn()
}))

// Mock additional dependencies to avoid import issues
jest.mock('../storeManagers/legendary/constants', () => ({
  legendaryConfigPath: '/mock/legendary/config',
  legendaryUserInfo: '/mock/legendary/user.json',
  legendaryInstalled: '/mock/legendary/installed.json'
}))

jest.mock('process', () => ({
  env: {
    XDG_CONFIG_HOME: '/mock/xdg/config'
  }
}))

describe('protocol.ts --no-gui behavior', () => {
  const mockMainWindow = {
    show: jest.fn()
  }

  const mockGameInfo = {
    app_name: 'test-game',
    title: 'Test Game',
    runner: 'legendary' as const,
    is_installed: false,
    install: {}
  }

  const mockGameSettings = {
    ignoreGameUpdates: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMainWindow as jest.Mock).mockReturnValue(mockMainWindow)
    ;(gameManagerMap.legendary.getGameInfo as jest.Mock).mockReturnValue(
      mockGameInfo
    )
    ;(gameManagerMap.legendary.getSettings as jest.Mock).mockResolvedValue(
      mockGameSettings
    )

    // Mock other game managers to return empty objects
    ;(gameManagerMap.gog.getGameInfo as jest.Mock).mockReturnValue({})
    ;(gameManagerMap.nile.getGameInfo as jest.Mock).mockReturnValue({})
    ;(gameManagerMap.sideload.getGameInfo as jest.Mock).mockReturnValue({})
  })

  describe('extended actions', () => {
    beforeEach(() => {
      mockIsCLINoGui.mockReturnValue(false)
      mockGameInfo.is_installed = true
    })

    test('should queue install when direct install parameters are provided', async () => {
      mockGameInfo.is_installed = false

      await handleProtocol([
        'heroic://install/legendary/test-game?path=C%3A%5CGames&platform=Windows'
      ])

      expect(addToQueue).toHaveBeenCalledTimes(1)
      expect(addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            path: 'C:\\Games',
            platformToInstall: 'Windows'
          })
        })
      )
      expect(sendFrontendMessage).not.toHaveBeenCalledWith(
        'installGame',
        'test-game',
        'legendary'
      )
    })

    test('should queue install using default settings when install details are omitted', async () => {
      mockGameInfo.is_installed = false

      await handleProtocol(['heroic://install/legendary/test-game'])

      expect(addToQueue).toHaveBeenCalledTimes(1)
      expect(dialog.showMessageBox).not.toHaveBeenCalled()
    })

    test('should not queue install when the game is already installed', async () => {
      mockGameInfo.is_installed = true

      await handleProtocol([
        'heroic://install/legendary/test-game?path=C%3A%5CGames&platform=Windows'
      ])

      expect(addToQueue).not.toHaveBeenCalled()
    })

    test('should call uninstall callback for uninstall action', async () => {
      await handleProtocol([
        'heroic://uninstall/legendary/test-game?path=C%3A%5COtherPath'
      ])

      expect(uninstallGameCallback).toHaveBeenCalledTimes(1)
      expect(uninstallGameCallback).toHaveBeenCalledWith(
        expect.anything(),
        'test-game',
        'legendary',
        false,
        false
      )
    })

    test('should call runner repair for repair action', async () => {
      ;(gameManagerMap.legendary as any).repair = jest.fn().mockResolvedValue({})

      await handleProtocol([
        'heroic://repair/legendary/test-game?path=C%3A%5COtherPath'
      ])

      expect(gameManagerMap.legendary.repair).toHaveBeenCalledWith('test-game')
    })

    test('should route verify action to repair implementation', async () => {
      ;(gameManagerMap.legendary as any).repair = jest.fn().mockResolvedValue({})

      await handleProtocol([
        'heroic://verify/legendary/test-game?path=C%3A%5COtherPath'
      ])

      expect(gameManagerMap.legendary.repair).toHaveBeenCalledWith('test-game')
    })

    test('should show status information for status action', async () => {
      ;(dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 0 })

      await handleProtocol(['heroic://status/legendary/test-game'])

      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        mockMainWindow,
        expect.objectContaining({
          message: expect.stringContaining('Runner: legendary')
        })
      )
    })
  })

  describe('when game is not installed', () => {
    beforeEach(() => {
      mockGameInfo.is_installed = false
    })

    describe('with --no-gui flag', () => {
      beforeEach(() => {
        mockIsCLINoGui.mockReturnValue(true)
      })

      test('should exit app when user clicks No', async () => {
        ;(dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 })

        await handleProtocol(['heroic://launch/test-game'])

        expect(app.quit).toHaveBeenCalled()
      })

      test('should show GUI and install when user clicks Yes', async () => {
        ;(dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 0 })

        await handleProtocol(['heroic://launch/test-game'])

        expect(mockMainWindow.show).toHaveBeenCalled()
        expect(sendFrontendMessage).toHaveBeenCalledWith(
          'installGame',
          'test-game',
          'legendary'
        )
        expect(app.quit).not.toHaveBeenCalled()
      })
    })

    describe('without --no-gui flag', () => {
      beforeEach(() => {
        mockIsCLINoGui.mockReturnValue(false)
      })

      test('should not exit app when user clicks No', async () => {
        ;(dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 })

        await handleProtocol(['heroic://launch/test-game'])

        expect(app.quit).not.toHaveBeenCalled()
        expect(mockMainWindow.show).not.toHaveBeenCalled()
      })

      test('should install when user clicks Yes (normal behavior)', async () => {
        ;(dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 0 })

        await handleProtocol(['heroic://launch/test-game'])

        expect(sendFrontendMessage).toHaveBeenCalledWith(
          'installGame',
          'test-game',
          'legendary'
        )
        expect(app.quit).not.toHaveBeenCalled()
        expect(mockMainWindow.show).not.toHaveBeenCalled()
      })
    })

    test('should not uninstall a game that is not installed', async () => {
      await handleProtocol(['heroic://uninstall/legendary/test-game'])

      expect(uninstallGameCallback).not.toHaveBeenCalled()
    })

    test('should not repair a game that is not installed', async () => {
      ;(gameManagerMap.legendary as any).repair = jest.fn().mockResolvedValue({})

      await handleProtocol(['heroic://repair/legendary/test-game'])

      expect(gameManagerMap.legendary.repair).not.toHaveBeenCalled()
    })

    test('should not verify a game that is not installed', async () => {
      ;(gameManagerMap.legendary as any).repair = jest.fn().mockResolvedValue({})

      await handleProtocol(['heroic://verify/legendary/test-game'])

      expect(gameManagerMap.legendary.repair).not.toHaveBeenCalled()
    })
  })

  describe('when game is installed', () => {
    beforeEach(() => {
      mockGameInfo.is_installed = true
    })

    test('should launch game directly regardless of --no-gui flag', async () => {
      mockIsCLINoGui.mockReturnValue(true)

      // Mock launchEventCallback to avoid complex setup
      const mockLaunchEventCallback = jest.fn()
      jest.doMock('../launcher', () => ({
        launchEventCallback: mockLaunchEventCallback
      }))

      await handleProtocol(['heroic://launch/test-game'])

      // Should not show dialog for installed games
      expect(dialog.showMessageBox).not.toHaveBeenCalled()
      expect(app.quit).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    test('should handle invalid URLs gracefully', async () => {
      await handleProtocol(['not-a-heroic-url'])

      // Should not crash or call any dialog/app methods
      expect(dialog.showMessageBox).not.toHaveBeenCalled()
      expect(app.quit).not.toHaveBeenCalled()
    })

    test('should handle missing game info', async () => {
      // Mock gameManagerMap to return empty object for missing games
      ;(gameManagerMap.legendary.getGameInfo as jest.Mock).mockReturnValue({})

      await handleProtocol(['heroic://launch/nonexistent-game'])

      // Should not show dialog if game info cannot be found
      expect(dialog.showMessageBox).not.toHaveBeenCalled()
      expect(app.quit).not.toHaveBeenCalled()
    })

    test('should handle missing main window', async () => {
      ;(getMainWindow as jest.Mock).mockReturnValue(null)
      mockIsCLINoGui.mockReturnValue(true)

      await handleProtocol(['heroic://launch/test-game'])

      // Should return early if no main window available
      expect(dialog.showMessageBox).not.toHaveBeenCalled()
      expect(app.quit).not.toHaveBeenCalled()
    })
  })
})
