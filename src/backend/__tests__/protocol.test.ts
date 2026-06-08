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

// Mock GlobalConfig so we can toggle hideWindowOnProtocolLaunch per test
const mockHideWindowOnProtocolLaunch = jest.fn(() => false)
jest.mock('../config', () => ({
  GlobalConfig: {
    get: () => ({
      getSettings: () => ({
        hideWindowOnProtocolLaunch: mockHideWindowOnProtocolLaunch()
      })
    })
  }
}))

import { handleProtocol, shouldHideWindowForProtocolArgs } from '../protocol'
import { app, dialog } from 'electron'
import { gameManagerMap } from '../storeManagers'
import { getMainWindow } from '../main_window'
import { sendFrontendMessage } from '../ipc'

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
    show: jest.fn(),
    hide: jest.fn(),
    isVisible: jest.fn(() => true)
  }

  const mockGameInfo = {
    app_name: 'test-game',
    title: 'Test Game',
    runner: 'legendary' as const,
    is_installed: false
  }

  const mockGameSettings = {
    ignoreGameUpdates: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockHideWindowOnProtocolLaunch.mockReturnValue(false)
    mockMainWindow.isVisible.mockReturnValue(true)
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

  describe('hide window on protocol launch', () => {
    beforeEach(() => {
      mockIsCLINoGui.mockReturnValue(false)
      mockGameInfo.is_installed = true
    })

    test('hides window when URL carries gui=false', async () => {
      await handleProtocol([
        'heroic://launch?appName=test-game&runner=legendary&gui=false'
      ])

      expect(mockMainWindow.hide).toHaveBeenCalled()
    })

    test('hides window when hideWindowOnProtocolLaunch setting is enabled', async () => {
      mockHideWindowOnProtocolLaunch.mockReturnValue(true)

      await handleProtocol(['heroic://launch/test-game'])

      expect(mockMainWindow.hide).toHaveBeenCalled()
    })

    test('does not hide window when neither setting nor URL param is set', async () => {
      await handleProtocol(['heroic://launch/test-game'])

      expect(mockMainWindow.hide).not.toHaveBeenCalled()
    })

    test('does not hide window that is not visible', async () => {
      mockMainWindow.isVisible.mockReturnValue(false)
      mockHideWindowOnProtocolLaunch.mockReturnValue(true)

      await handleProtocol(['heroic://launch/test-game'])

      expect(mockMainWindow.hide).not.toHaveBeenCalled()
    })

    test('shows window when not-installed game needs install dialog, regardless of hide setting', async () => {
      mockGameInfo.is_installed = false
      mockHideWindowOnProtocolLaunch.mockReturnValue(true)
      ;(dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 0 })

      await handleProtocol(['heroic://launch/test-game'])

      expect(mockMainWindow.show).toHaveBeenCalled()
      expect(sendFrontendMessage).toHaveBeenCalledWith(
        'installGame',
        'test-game',
        'legendary'
      )
    })
  })

  describe('shouldHideWindowForProtocolArgs', () => {
    beforeEach(() => {
      mockHideWindowOnProtocolLaunch.mockReturnValue(false)
    })

    test('returns true when URL has gui=false', () => {
      expect(
        shouldHideWindowForProtocolArgs([
          'heroic://launch?appName=foo&gui=false'
        ])
      ).toBe(true)
    })

    test('accepts gui=0 and gui=no as equivalent to false', () => {
      expect(
        shouldHideWindowForProtocolArgs(['heroic://launch?appName=foo&gui=0'])
      ).toBe(true)
      expect(
        shouldHideWindowForProtocolArgs(['heroic://launch?appName=foo&gui=no'])
      ).toBe(true)
    })

    test('returns true when setting is enabled', () => {
      mockHideWindowOnProtocolLaunch.mockReturnValue(true)
      expect(
        shouldHideWindowForProtocolArgs(['heroic://launch/test-game'])
      ).toBe(true)
    })

    test('returns false when setting is off and URL has no gui param', () => {
      expect(
        shouldHideWindowForProtocolArgs(['heroic://launch/test-game'])
      ).toBe(false)
    })

    test('returns false for non-launch protocol URLs even with setting on', () => {
      mockHideWindowOnProtocolLaunch.mockReturnValue(true)
      expect(shouldHideWindowForProtocolArgs(['heroic://ping'])).toBe(false)
    })

    test('returns false when no heroic URL is present', () => {
      mockHideWindowOnProtocolLaunch.mockReturnValue(true)
      expect(
        shouldHideWindowForProtocolArgs(['/path/to/heroic', '--some-flag'])
      ).toBe(false)
    })
  })
})
