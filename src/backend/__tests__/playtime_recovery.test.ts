jest.mock('../constants/key_value_stores', () => ({
  activeSessionsStore: {
    raw_store: {},
    delete: jest.fn()
  },
  tsStore: {
    set: jest.fn(),
    get: jest.fn()
  }
}))

jest.mock('../storeManagers', () => ({
  libraryManagerMap: {
    gog: { getGame: jest.fn() },
    legendary: { getGame: jest.fn() }
  }
}))

jest.mock('../logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))

import { activeSessionsStore, tsStore } from '../constants/key_value_stores'
import { libraryManagerMap } from '../storeManagers'
import { logError } from '../logger'
import { recoverOrphanedSessions } from '../playtime_recovery'

const mockActiveStore = activeSessionsStore as unknown as {
  raw_store: Record<string, unknown>
  delete: jest.Mock
}
const mockTsStoreSet = tsStore.set as unknown as jest.Mock
const mockTsStoreGet = tsStore.get as unknown as jest.Mock
const mockGogGetGame = libraryManagerMap.gog.getGame as unknown as jest.Mock
const mockLegendaryGetGame = libraryManagerMap.legendary.getGame as unknown as jest.Mock
const mockLogError = logError as unknown as jest.Mock

const mockGogGame = { updatePlaytime: jest.fn() }
const mockLegendaryGame = {}

const ISO_START = '2026-07-06T14:00:00.000Z'

const makeCheckpointAt = (minutesAfterStart: number): string =>
  new Date(Date.parse(ISO_START) + minutesAfterStart * 60_000).toISOString()

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve))

describe('recoverOrphanedSessions', () => {
  beforeEach(() => {
    mockActiveStore.raw_store = {}
    mockActiveStore.delete.mockClear()
    mockTsStoreSet.mockClear()
    mockTsStoreGet.mockClear().mockReturnValue(0)
    mockGogGetGame.mockClear().mockReturnValue(mockGogGame)
    mockLegendaryGetGame.mockClear().mockReturnValue(mockLegendaryGame)
    mockGogGame.updatePlaytime.mockClear().mockResolvedValue(undefined)
    mockLogError.mockClear()
  })

  test('empty store: no writes, no deletes, returns without error', async () => {
    await recoverOrphanedSessions()
    expect(mockTsStoreSet).not.toHaveBeenCalled()
    expect(mockActiveStore.delete).not.toHaveBeenCalled()
    expect(mockGogGame.updatePlaytime).not.toHaveBeenCalled()
  })

  test('single GOG orphan: tsStore updated with adjusted minutes and updatePlaytime called', async () => {
    // wall = 8m, suspend = 3m, active = 5m
    const checkpointAt = makeCheckpointAt(8)
    mockActiveStore.raw_store = {
      '1511366207': {
        runner: 'gog',
        title: 'Showgunners',
        startedAt: ISO_START,
        checkpointAt,
        totalSuspendMs: 3 * 60_000,
        suspendedAt: null
      }
    }
    mockTsStoreGet.mockReturnValue(10)

    await recoverOrphanedSessions()

    expect(mockTsStoreSet).toHaveBeenCalledWith('1511366207.lastPlayed', checkpointAt)
    expect(mockTsStoreSet).toHaveBeenCalledWith('1511366207.totalPlayed', 15)
    expect(mockGogGame.updatePlaytime).toHaveBeenCalledWith(new Date(ISO_START), 5)
    expect(mockActiveStore.delete).toHaveBeenCalledWith('1511366207')
  })

  test('non-GOG runner (no updatePlaytime method): tsStore updated, no sync call', async () => {
    const checkpointAt = makeCheckpointAt(5)
    mockActiveStore.raw_store = {
      'epic-game': {
        runner: 'legendary',
        title: 'Some Epic Game',
        startedAt: ISO_START,
        checkpointAt,
        totalSuspendMs: 0,
        suspendedAt: null
      }
    }

    await recoverOrphanedSessions()

    expect(mockTsStoreSet).toHaveBeenCalledWith('epic-game.totalPlayed', 5)
    expect(mockGogGame.updatePlaytime).not.toHaveBeenCalled()
    expect(mockActiveStore.delete).toHaveBeenCalledWith('epic-game')
  })

  test('short session (< 1 min): tsStore updated with floor, updatePlaytime skipped', async () => {
    const checkpointAt = new Date(Date.parse(ISO_START) + 30_000).toISOString()
    mockActiveStore.raw_store = {
      '1511366207': {
        runner: 'gog',
        title: 'Short',
        startedAt: ISO_START,
        checkpointAt,
        totalSuspendMs: 0,
        suspendedAt: null
      }
    }

    await recoverOrphanedSessions()

    expect(mockTsStoreSet).toHaveBeenCalledWith('1511366207.totalPlayed', 0)
    expect(mockGogGame.updatePlaytime).not.toHaveBeenCalled()
    expect(mockActiveStore.delete).toHaveBeenCalledWith('1511366207')
  })

  test('persisted totalSuspendMs used as-is (fold already applied at persist time)', async () => {
    // wall = 10m, persisted totalSuspendMs = 4m. Recovery trusts the snapshot — no double-fold.
    const checkpointAt = makeCheckpointAt(10)
    mockActiveStore.raw_store = {
      '1511366207': {
        runner: 'gog',
        title: 'Showgunners',
        startedAt: ISO_START,
        checkpointAt,
        totalSuspendMs: 4 * 60_000,
        suspendedAt: Date.parse(ISO_START) + 6 * 60_000
      }
    }

    await recoverOrphanedSessions()

    // active = 10 - 4 = 6m
    expect(mockTsStoreSet).toHaveBeenCalledWith('1511366207.totalPlayed', 6)
    expect(mockGogGame.updatePlaytime).toHaveBeenCalledWith(new Date(ISO_START), 6)
  })

  test('unknown runner: outer catch fires, activeSessionsStore.delete still runs', async () => {
    // runner is not in libraryManagerMap → libraryManagerMap[runner] is undefined
    // → undefined.getGame() throws TypeError → outer catch → logError → finally deletes.
    mockActiveStore.raw_store = {
      'weird-game': {
        runner: 'unknown-runner',
        title: 'Weird Game',
        startedAt: ISO_START,
        checkpointAt: makeCheckpointAt(5),
        totalSuspendMs: 0,
        suspendedAt: null
      }
    }

    await recoverOrphanedSessions()

    expect(mockActiveStore.delete).toHaveBeenCalledWith('weird-game')
    expect(mockLogError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to finalize orphaned session for weird-game'),
      'Backend'
    )
  })

  test('multiple orphans: each processed independently', async () => {
    mockActiveStore.raw_store = {
      'game-a': {
        runner: 'gog',
        title: 'Game A',
        startedAt: ISO_START,
        checkpointAt: makeCheckpointAt(3),
        totalSuspendMs: 0,
        suspendedAt: null
      },
      'game-b': {
        runner: 'gog',
        title: 'Game B',
        startedAt: ISO_START,
        checkpointAt: makeCheckpointAt(6),
        totalSuspendMs: 0,
        suspendedAt: null
      }
    }

    await recoverOrphanedSessions()

    expect(mockTsStoreSet).toHaveBeenCalledWith('game-a.totalPlayed', 3)
    expect(mockTsStoreSet).toHaveBeenCalledWith('game-b.totalPlayed', 6)
    expect(mockActiveStore.delete).toHaveBeenCalledWith('game-a')
    expect(mockActiveStore.delete).toHaveBeenCalledWith('game-b')
    expect(mockGogGame.updatePlaytime).toHaveBeenCalledTimes(2)
  })

  test('updatePlaytime rejection: .catch logs error, does not block loop', async () => {
    mockActiveStore.raw_store = {
      'game-a': {
        runner: 'gog',
        title: 'Game A',
        startedAt: ISO_START,
        checkpointAt: makeCheckpointAt(3),
        totalSuspendMs: 0,
        suspendedAt: null
      },
      'game-b': {
        runner: 'gog',
        title: 'Game B',
        startedAt: ISO_START,
        checkpointAt: makeCheckpointAt(4),
        totalSuspendMs: 0,
        suspendedAt: null
      }
    }
    mockGogGame.updatePlaytime
      .mockRejectedValueOnce(new Error('POST failed'))
      .mockResolvedValueOnce(undefined)

    await recoverOrphanedSessions()
    await flushMicrotasks()

    expect(mockActiveStore.delete).toHaveBeenCalledWith('game-a')
    expect(mockActiveStore.delete).toHaveBeenCalledWith('game-b')
    expect(mockGogGame.updatePlaytime).toHaveBeenCalledTimes(2)
    expect(mockLogError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to enqueue orphaned gog session for game-a'),
      'Backend'
    )
  })
})
