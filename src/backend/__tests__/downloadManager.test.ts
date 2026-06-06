import type { DMQueueElement } from 'common/types'

// ---- Mocks ----

jest.mock('backend/storeManagers', () => ({
  libraryManagerMap: {
    legendary: { getGameInfo: jest.fn(), getInstallInfo: jest.fn() },
    gog: { getGameInfo: jest.fn(), getInstallInfo: jest.fn() }
  },
  gameManagerMap: {
    legendary: { getGameInfo: jest.fn(), stop: jest.fn() },
    gog: { getGameInfo: jest.fn(), stop: jest.fn() }
  }
}))

jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { DownloadManager: 'DownloadManager' }
}))

jest.mock('backend/utils', () => ({
  getFileSize: jest.fn(() => '1.2 GB'),
  removeFolder: jest.fn(),
  sendGameStatusUpdate: jest.fn()
}))

jest.mock('backend/ipc', () => ({
  sendFrontendMessage: jest.fn()
}))

jest.mock('backend/dialog/dialog', () => ({
  notify: jest.fn()
}))

jest.mock('backend/online_monitor', () => ({
  onConnectivityChange: jest.fn()
}))

jest.mock('backend/utils/aborthandler/aborthandler', () => ({
  callAbortController: jest.fn()
}))

jest.mock('backend/storeManagers/gog/redist', () => ({
  createRedistDMQueueElement: jest.fn(() => ({
    type: 'install',
    params: {
      appName: 'gog-redist',
      runner: 'gog',
      platformToInstall: 'Windows',
      dependencies: []
    }
  }))
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true)
}))

jest.mock('backend/storeManagers/gog/constants', () => ({
  gogRedistPath: '/mock/gog/redist'
}))

jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: jest.fn((key: string) => key) },
  t: jest.fn((key: string) => key)
}))

jest.mock('backend/electron_store', () => {
  const store: Record<string, unknown> = {}
  return {
    TypeCheckedStoreBackend: jest.fn().mockImplementation(() => ({
      get: (key: string, def: unknown) => store[key] ?? def,
      set: (key: string, val: unknown) => {
        store[key] = val
      },
      has: (key: string) => key in store,
      delete: (key: string) => {
        delete store[key]
      }
    }))
  }
})

jest.mock('backend/downloadmanager/utils', () => ({
  installQueueElement: jest.fn(),
  updateQueueElement: jest.fn()
}))

// ---- Helpers ----

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve))

function makeElement(
  appName: string,
  type: 'install' | 'update' = 'install',
  runner: 'legendary' | 'gog' = 'legendary'
): DMQueueElement {
  return {
    type,
    addToQueueTime: Date.now(),
    startTime: 0,
    endTime: 0,
    params: {
      appName,
      runner,
      path: `/games/${appName}`,
      platformToInstall: 'Linux',
      gameInfo: { title: appName } as any,
      branch: undefined,
      build: undefined,
      size: undefined,
      installDlcs: []
    }
  } as unknown as DMQueueElement
}

// ---- Module references (reset each test via resetModules) ----

let dm: {
  addToQueue: (el: DMQueueElement) => void
  initQueue: () => Promise<void>
  removeFromQueue: (appName: string) => void
  pauseCurrentDownload: () => void
  resumeCurrentDownload: () => void
  cancelCurrentDownload: (opts: { removeDownloaded?: boolean }) => void
  getQueueInformation: () => { elements: any[]; finished: any[]; state: string }
  isRunning: () => boolean
}

let mockInstall: jest.Mock
let mockUpdate: jest.Mock
let mockLibraryManager: any
let mockGameManager: any
let mockSendFrontendMessage: jest.Mock
let mockSendGameStatusUpdate: jest.Mock
let mockCallAbortController: jest.Mock
let mockLogError: jest.Mock
let mockExistsSync: jest.Mock
let onConnectivityCallback: (status: 'online' | 'offline') => void

beforeEach(async () => {
  await jest.isolateModulesAsync(async () => {
    dm = await import('backend/downloadmanager/downloadqueue')

    const dmUtils = await import('backend/downloadmanager/utils')
    mockInstall = dmUtils.installQueueElement as jest.Mock
    mockUpdate = dmUtils.updateQueueElement as jest.Mock

    const storeManagers = await import('backend/storeManagers')
    mockLibraryManager = storeManagers.libraryManagerMap
    mockGameManager = storeManagers.gameManagerMap

    mockSendFrontendMessage = (await import('backend/ipc'))
      .sendFrontendMessage as jest.Mock
    mockSendGameStatusUpdate = (await import('backend/utils'))
      .sendGameStatusUpdate as jest.Mock
    mockCallAbortController = (
      await import('backend/utils/aborthandler/aborthandler')
    ).callAbortController as jest.Mock
    mockLogError = (await import('backend/logger')).logError as jest.Mock
    mockExistsSync = (await import('fs')).existsSync as jest.Mock

    const onlineMonitor = await import('backend/online_monitor')
    onConnectivityCallback = (onlineMonitor.onConnectivityChange as jest.Mock)
      .mock.calls[0]?.[0]
  })

  // Default implementations
  mockInstall.mockResolvedValue({ status: 'done' })
  mockUpdate.mockResolvedValue({ status: 'done' })
  mockExistsSync.mockReturnValue(true)

  mockLibraryManager.legendary.getGameInfo.mockReturnValue({})
  mockLibraryManager.gog.getGameInfo.mockReturnValue({})
  mockLibraryManager.legendary.getInstallInfo.mockResolvedValue({
    manifest: { download_size: 1_000_000 }
  })
  mockLibraryManager.gog.getInstallInfo.mockResolvedValue({
    manifest: { download_size: 1_000_000 }
  })

  mockGameManager.legendary.getGameInfo.mockReturnValue({
    title: 'Test Game',
    folder_name: '/games/test'
  })
  mockGameManager.gog.getGameInfo.mockReturnValue({
    title: 'Test Game',
    folder_name: '/games/test'
  })
})

// ================================================================
// 1. addToQueue — basic behavior
// ================================================================

describe('addToQueue', () => {
  it('adds a new element to the queue', () => {
    dm.addToQueue(makeElement('game1'))
    const { elements } = dm.getQueueInformation()
    expect(elements).toHaveLength(1)
    expect(elements[0].params.appName).toBe('game1')
  })

  it('updates an existing element instead of duplicating', () => {
    const el = makeElement('game1')
    dm.addToQueue(el)

    const updated = { ...el, params: { ...el.params, size: '5 GB' } }
    dm.addToQueue(updated as DMQueueElement)

    const { elements } = dm.getQueueInformation()
    expect(elements).toHaveLength(1)
    expect(elements[0].params.size).toBe('5 GB')
  })

  it('sends queued status to frontend', () => {
    dm.addToQueue(makeElement('game1'))
    expect(mockSendGameStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'game1', status: 'queued' })
    )
  })

  it('notifies frontend of queue change', () => {
    dm.addToQueue(makeElement('game1'))
    expect(mockSendFrontendMessage).toHaveBeenCalledWith(
      'changedDMQueueInformation',
      expect.any(Array),
      expect.any(String)
    )
  })

  it('install has not started when addToQueue returns (enrichment is async)', async () => {
    let installStarted = false
    mockInstall.mockImplementation(() => {
      installStarted = true
      return Promise.resolve({ status: 'done' })
    })

    dm.addToQueue(makeElement('game1'))

    // addToQueue returned synchronously; installQueueElement is called only after
    // enrichElement's async getInstallInfo resolves (one microtask away)
    expect(installStarted).toBe(false)

    await flushPromises() // cleanup
  })

  it('rejects undefined element and logs error', () => {
    dm.addToQueue(undefined as any)
    expect(mockLogError).toHaveBeenCalled()
    expect(dm.getQueueInformation().elements).toHaveLength(0)
  })
})

// ================================================================
// 2. initQueue — processing
// ================================================================

describe('initQueue', () => {
  it('processes the first element in the queue', async () => {
    dm.addToQueue(makeElement('game1'))
    await flushPromises()
    expect(mockInstall).toHaveBeenCalledTimes(1)
    expect(mockInstall).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'game1' })
    )
  })

  it('calls enrichElement before processing and updates size', async () => {
    dm.addToQueue(makeElement('game1'))
    await flushPromises()

    expect(mockLibraryManager.legendary.getInstallInfo).toHaveBeenCalledTimes(1)
    const { finished } = dm.getQueueInformation()
    expect(finished[0].params.size).toBe('1.2 GB')
  })

  it('processes multiple elements sequentially', async () => {
    dm.addToQueue(makeElement('game1'))
    dm.addToQueue(makeElement('game2'))
    dm.addToQueue(makeElement('game3'))
    await flushPromises()
    expect(mockInstall).toHaveBeenCalledTimes(3)
    const calls = mockInstall.mock.calls.map((c: any) => c[0].appName)
    expect(calls).toEqual(['game1', 'game2', 'game3'])
  })

  it('sets state to idle after finishing', async () => {
    dm.addToQueue(makeElement('game1'))
    await flushPromises()
    expect(dm.getQueueInformation().state).toBe('idle')
  })

  it('moves processed element to finished with status done', async () => {
    dm.addToQueue(makeElement('game1'))
    await flushPromises()

    const { elements, finished } = dm.getQueueInformation()
    expect(elements).toHaveLength(0)
    expect(finished).toHaveLength(1)
    expect(finished[0].params.appName).toBe('game1')
    expect(finished[0].status).toBe('done')
  })

  it('handles install error without killing the queue', async () => {
    mockInstall
      .mockRejectedValueOnce(new Error('install failed'))
      .mockResolvedValue({ status: 'done' })

    dm.addToQueue(makeElement('game1'))
    dm.addToQueue(makeElement('game2'))
    await flushPromises()

    const { finished } = dm.getQueueInformation()
    expect(finished).toHaveLength(2)
    expect(finished[0].status).toBe('error')
    expect(finished[1].status).toBe('done')
  })

  it('does not launch two concurrent processing loops', async () => {
    dm.addToQueue(makeElement('game1'))
    dm.addToQueue(makeElement('game2'))
    await flushPromises()

    // Even though addToQueue is called twice (and each tries to start initQueue),
    // the processingLock ensures only one loop runs.
    expect(mockInstall).toHaveBeenCalledTimes(2)
  })
})

// ================================================================
// 3. Pause / resume
// ================================================================

describe('pause and resume', () => {
  it('pausing mid-queue stops after current element', async () => {
    let resolveInstall: (val: { status: string }) => void
    mockInstall
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInstall = resolve
          })
      )
      .mockResolvedValue({ status: 'done' })

    dm.addToQueue(makeElement('game1'))
    dm.addToQueue(makeElement('game2'))
    await flushPromises() // enrichment done, game1 install hanging

    dm.pauseCurrentDownload()
    resolveInstall!({ status: 'abort' })
    await flushPromises()

    expect(mockInstall).toHaveBeenCalledTimes(1)
    expect(dm.getQueueInformation().state).toBe('paused')
    const { elements } = dm.getQueueInformation()
    expect(elements.some((e: any) => e.params.appName === 'game2')).toBe(true)
  })

  it('resuming processes the remaining queue', async () => {
    let resolveInstall: (val: { status: string }) => void
    mockInstall
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInstall = resolve
          })
      )
      .mockResolvedValue({ status: 'done' })

    dm.addToQueue(makeElement('game1'))
    dm.addToQueue(makeElement('game2'))
    await flushPromises()

    dm.pauseCurrentDownload()
    resolveInstall!({ status: 'abort' })
    await flushPromises()

    expect(dm.getQueueInformation().state).toBe('paused')

    dm.resumeCurrentDownload()
    await flushPromises()

    expect(dm.getQueueInformation().state).toBe('idle')
    // game2 should now be processed
    expect(mockInstall.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('state is set to idle before initQueue is called on resume', () => {
    // After pauseCurrentDownload, state is 'paused'.
    // resumeCurrentDownload must set it to 'idle' synchronously before firing initQueue,
    // otherwise initQueue's isPaused() check would exit the loop immediately.
    dm.pauseCurrentDownload()
    expect(dm.getQueueInformation().state).toBe('paused')

    dm.resumeCurrentDownload()
    // At this point, resumeCurrentDownload has run synchronously:
    // it sets queueState='idle' THEN fires void initQueue().
    // The state check below runs before any async code in initQueue.
    expect(dm.getQueueInformation().state).toBe('idle')
  })
})

// ================================================================
// 4. Cancel
// ================================================================

describe('cancelCurrentDownload', () => {
  it('removes the current element from the queue', async () => {
    let resolveInstall: (val: any) => void
    mockInstall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstall = resolve
        })
    )

    dm.addToQueue(makeElement('game1'))
    await flushPromises() // past enrichment, install hanging

    dm.cancelCurrentDownload({ removeDownloaded: false })

    const { elements } = dm.getQueueInformation()
    expect(
      elements.find((e: any) => e.params.appName === 'game1')
    ).toBeUndefined()

    resolveInstall!({ status: 'abort' })
    await flushPromises()
  })

  it('calls callAbortController with the correct appName', async () => {
    let resolveInstall: (val: any) => void
    mockInstall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstall = resolve
        })
    )

    dm.addToQueue(makeElement('game1'))
    await flushPromises()

    dm.cancelCurrentDownload({ removeDownloaded: false })
    expect(mockCallAbortController).toHaveBeenCalledWith('game1')

    resolveInstall!({ status: 'abort' })
    await flushPromises()
  })

  it('cancels correctly when download was previously paused', async () => {
    let resolveInstall: (val: any) => void
    mockInstall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstall = resolve
        })
    )

    dm.addToQueue(makeElement('game1'))
    await flushPromises() // past enrichment, install hanging

    dm.pauseCurrentDownload()
    resolveInstall!({ status: 'abort' })
    await flushPromises() // finally block runs, currentElement = null

    expect(dm.getQueueInformation().state).toBe('paused')

    dm.cancelCurrentDownload({ removeDownloaded: false })

    const { elements } = dm.getQueueInformation()
    expect(
      elements.find((e: any) => e.params.appName === 'game1')
    ).toBeUndefined()
  })

  it('cancelling also removes DLC entries from queue', async () => {
    let resolveInstall: (val: any) => void
    mockInstall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstall = resolve
        })
    )

    const parent = makeElement('parent-game')
    parent.params.installDlcs = ['dlc-one']
    const dlc = makeElement('dlc-one')

    dm.addToQueue(parent)
    dm.addToQueue(dlc)
    await flushPromises() // past enrichment, install hanging

    dm.cancelCurrentDownload({ removeDownloaded: false })

    const { elements } = dm.getQueueInformation()
    expect(
      elements.find((e: any) => e.params.appName === 'parent-game')
    ).toBeUndefined()
    expect(
      elements.find((e: any) => e.params.appName === 'dlc-one')
    ).toBeUndefined()

    resolveInstall!({ status: 'abort' })
    await flushPromises()
  })
})

// ================================================================
// 5. Enrichment — lazy and safe
// ================================================================

describe('enrichment', () => {
  it('element cancelled during enrichment is skipped', async () => {
    let resolveInstallInfo: (val: any) => void
    mockLibraryManager.legendary.getInstallInfo.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstallInfo = resolve
        })
    )

    dm.addToQueue(makeElement('game1'))
    // initQueue is now blocked at await getInstallInfo() inside enrichElement

    dm.removeFromQueue('game1')

    resolveInstallInfo!({ manifest: { download_size: 1_000_000 } })
    await flushPromises()

    expect(mockInstall).not.toHaveBeenCalled()
  })

  it('GOG redist is inserted right after current element, not at hardcoded index 0', async () => {
    mockLibraryManager.gog.getInstallInfo.mockResolvedValue({
      manifest: {
        download_size: 1_000_000,
        dependencies: ['vcredist']
      }
    })

    let resolveInstall: (val: any) => void
    mockInstall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstall = resolve
        })
    )

    const gogEl = makeElement('gog-game', 'install', 'gog')
    gogEl.params.platformToInstall = 'Windows'
    const el2 = makeElement('game2')

    dm.addToQueue(gogEl)
    dm.addToQueue(el2)
    await flushPromises() // enrichment done, gog-game install hanging

    const { elements } = dm.getQueueInformation()
    expect(elements[0].params.appName).toBe('gog-game')
    expect(elements[1].params.appName).toBe('gog-redist')
    expect(elements[2].params.appName).toBe('game2')

    resolveInstall!({ status: 'done' })
    await flushPromises()
  })

  it('EA-managed games skip getInstallInfo', async () => {
    mockLibraryManager.legendary.getGameInfo.mockReturnValue({
      isEAManaged: true
    })

    dm.addToQueue(makeElement('ea-game'))
    await flushPromises()

    expect(mockLibraryManager.legendary.getInstallInfo).not.toHaveBeenCalled()
  })

  it('Ubisoft-managed games skip getInstallInfo', async () => {
    mockLibraryManager.legendary.getGameInfo.mockReturnValue({
      isUbisoftManaged: true
    })

    dm.addToQueue(makeElement('ubi-game'))
    await flushPromises()

    expect(mockLibraryManager.legendary.getInstallInfo).not.toHaveBeenCalled()
  })

  it('size is updated with real value after enrichment', async () => {
    dm.addToQueue(makeElement('game1'))
    await flushPromises()

    const { finished } = dm.getQueueInformation()
    expect(finished[0].params.size).toBe('1.2 GB')
  })
})

// ================================================================
// 6. removeFromQueue
// ================================================================

describe('removeFromQueue', () => {
  it('removes element by appName', () => {
    dm.addToQueue(makeElement('game1'))
    dm.addToQueue(makeElement('game2'))
    dm.removeFromQueue('game1')

    const { elements } = dm.getQueueInformation()
    expect(elements).toHaveLength(1)
    expect(elements[0].params.appName).toBe('game2')
  })

  it('does nothing if appName not in queue', () => {
    dm.addToQueue(makeElement('game1'))
    expect(() => dm.removeFromQueue('nonexistent')).not.toThrow()

    const { elements } = dm.getQueueInformation()
    expect(elements).toHaveLength(1)
  })

  it('sends done status update', () => {
    dm.addToQueue(makeElement('game1'))
    dm.removeFromQueue('game1')
    expect(mockSendGameStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'game1', status: 'done' })
    )
  })

  it('notifies frontend after removal', () => {
    dm.addToQueue(makeElement('game1'))
    mockSendFrontendMessage.mockClear()
    dm.removeFromQueue('game1')
    expect(mockSendFrontendMessage).toHaveBeenCalledWith(
      'changedDMQueueInformation',
      expect.any(Array),
      expect.any(String)
    )
  })
})

// ================================================================
// 7. Connectivity (auto-pause / auto-resume)
// ================================================================

describe('connectivity', () => {
  it('going offline while running pauses the queue', async () => {
    let resolveInstall: (val: any) => void
    mockInstall.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstall = resolve
        })
    )

    dm.addToQueue(makeElement('game1'))
    await flushPromises() // past enrichment, install hanging

    expect(dm.isRunning()).toBe(true)

    onConnectivityCallback('offline')

    expect(dm.getQueueInformation().state).toBe('paused')
    expect(mockCallAbortController).toHaveBeenCalledWith('game1')

    resolveInstall!({ status: 'abort' })
    await flushPromises()
  })

  it('coming back online after auto-pause resumes the queue', async () => {
    let resolveInstall: (val: any) => void
    mockInstall
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInstall = resolve
          })
      )
      .mockResolvedValue({ status: 'done' })

    dm.addToQueue(makeElement('game1'))
    await flushPromises()

    onConnectivityCallback('offline')
    resolveInstall!({ status: 'abort' })
    await flushPromises()

    expect(dm.getQueueInformation().state).toBe('paused')

    onConnectivityCallback('online')
    await flushPromises()

    expect(dm.getQueueInformation().state).toBe('idle')
  })

  it('coming online when not auto-paused does nothing', async () => {
    onConnectivityCallback('online')
    await flushPromises()

    expect(mockInstall).not.toHaveBeenCalled()
    expect(dm.getQueueInformation().state).toBe('idle')
  })
})
