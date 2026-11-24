import { buildMacOsShortcutLaunchCommand } from '../macos_shortcut'
import { addShortcuts } from '../shortcuts'
import { addNonSteamGame } from '../../nonesteamgame/nonesteamgame'
import { GlobalConfig } from 'backend/config'
import type { Game } from 'common/types/game_manager'
import type { Runner } from 'common/types'

jest.mock('electron')
jest.mock('backend/logger')
jest.mock('backend/config')
jest.mock('backend/utils')
jest.mock('backend/storeManagers', () => ({ libraryManagerMap: {} }))
jest.mock('../../nonesteamgame/nonesteamgame', () => ({
  addNonSteamGame: jest.fn()
}))
jest.mock('../../utils', () => ({
  getIcon: jest.fn().mockResolvedValue('/tmp/icon.png')
}))

describe('macOS shortcuts', () => {
  test('quotes the launch URL as one shell argument', () => {
    expect(
      buildMacOsShortcutLaunchCommand(
        '/Applications/Heroic.app/Contents/MacOS/Heroic',
        'test-app',
        'sideload'
      )
    ).toBe(
      '/Applications/Heroic.app/Contents/MacOS/Heroic --no-gui "heroic://launch?appName=test-app&runner=sideload"'
    )
  })
})

function makeGameMock(runner: Runner): Game {
  return {
    getGameInfo: () => ({
      title: 'My Game',
      app_name: 'Game',
      runner,
      install: { is_dlc: false }
    })
  } as Game
}

describe('Steam shortcut creation guard', () => {
  beforeEach(() => {
    GlobalConfig.setConfigValue('addSteamShortcuts', true)
    GlobalConfig.setConfigValue('addDesktopShortcuts', false)
    GlobalConfig.setConfigValue('addStartMenuShortcuts', false)
  })

  test('skips Steam shortcuts for games from the steam runner', async () => {
    await addShortcuts(makeGameMock('steam'))

    expect(addNonSteamGame).not.toBeCalled()
  })

  test('still adds Steam shortcuts for other runners', async () => {
    const game = makeGameMock('sideload')

    await addShortcuts(game)

    expect(addNonSteamGame).toBeCalledWith(game)
  })
})
