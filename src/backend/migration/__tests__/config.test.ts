import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import type { GameConfig } from 'backend/game_config'
import { UmuSteamRuntimeMigration } from '../migrations/config'

let mockGamesConfigPath = ''
const mockGetGameConfig = jest.fn()

jest.mock('backend/constants/paths', () => ({
  get gamesConfigPath() {
    return mockGamesConfigPath
  }
}))
jest.mock('backend/constants/environment', () => ({ isLinux: true }))
jest.mock('backend/logger', () => ({ logDebug: jest.fn() }))
jest.mock('backend/game_config', () => ({
  GameConfig: {
    get: (appName: string): GameConfig =>
      mockGetGameConfig(appName) as GameConfig
  }
}))

describe('UmuSteamRuntimeMigration', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'heroic-migration-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('succeeds when the GamesConfig folder does not exist yet', async () => {
    mockGamesConfigPath = join(tmpDir, 'GamesConfig')

    await expect(new UmuSteamRuntimeMigration().run()).resolves.toBe(true)
    expect(mockGetGameConfig).not.toHaveBeenCalled()
  })

  it('enables umu-scout only for games that used the Steam Runtime', async () => {
    mockGamesConfigPath = tmpDir
    writeFileSync(join(tmpDir, 'withRuntime.json'), '{}')
    writeFileSync(join(tmpDir, 'withoutRuntime.json'), '{}')
    writeFileSync(join(tmpDir, 'notes.txt'), '')

    const setSetting = jest.fn()
    mockGetGameConfig.mockImplementation(
      (appName: string) =>
        ({
          getSettings: () =>
            Promise.resolve({ useSteamRuntime: appName === 'withRuntime' }),
          setSetting
        }) as unknown as GameConfig
    )

    await expect(new UmuSteamRuntimeMigration().run()).resolves.toBe(true)
    expect(mockGetGameConfig).toHaveBeenCalledTimes(2)
    expect(setSetting).toHaveBeenCalledTimes(1)
    expect(setSetting).toHaveBeenCalledWith('steamRuntime', 'umu-scout')
  })
})
