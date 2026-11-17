import Store from 'electron-store'
import type { DMQueueElement, DMStatus } from 'common/types'

jest.mock('../utils', () => ({
  installQueueElement: jest.fn(),
  updateQueueElement: jest.fn()
}))
jest.mock('../../utils', () => ({
  getFileSize: () => '1 GB',
  removeFolder: jest.fn(),
  sendGameStatusUpdate: jest.fn()
}))
jest.mock('../../ipc', () => ({ sendFrontendMessage: jest.fn() }))
jest.mock('../../dialog/dialog', () => ({ notify: jest.fn() }))
jest.mock('backend/utils/aborthandler/aborthandler', () => ({
  callAbortController: jest.fn()
}))
jest.mock('backend/storeManagers/gog/redist', () => ({
  createRedistDMQueueElement: jest.fn()
}))
jest.mock('backend/storeManagers/gog/constants', () => ({
  gogRedistPath: '/nonexistent'
}))
jest.mock('backend/storeManagers/steam/backlog', () => ({
  forgetSteamInstall: jest.fn(async () => Promise.resolve()),
  pruneSteamBacklog: jest.fn(async () => Promise.resolve())
}))
jest.mock('backend/online_monitor', () => ({ onConnectivityChange: jest.fn() }))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { DownloadManager: 'DownloadManager' }
}))
jest.mock('backend/storeManagers', () => {
  const game = {
    getGameInfo: () => ({ title: 'Game', folder_name: 'game' }),
    stop: jest.fn()
  }
  const manager = {
    getGameInfo: () => ({}),
    getInstallInfo: async () => Promise.resolve(undefined),
    getGame: () => game
  }
  return { libraryManagerMap: { steam: manager } }
})

type Utils = typeof import('../utils')
type Backlog = typeof import('backend/storeManagers/steam/backlog')
let install: jest.MockedFunction<Utils['installQueueElement']>
let update: jest.MockedFunction<Utils['updateQueueElement']>
let forget: jest.MockedFunction<Backlog['forgetSteamInstall']>

// One open install per app.
const pending = new Map<string, (status: DMStatus) => void>()

function element(
  appName: string,
  type: DMQueueElement['type'] = 'install'
): DMQueueElement {
  return {
    type,
    params: {
      appName,
      runner: 'steam',
      path: '/games',
      platformToInstall: 'linux',
      gameInfo: { title: appName }
    } as DMQueueElement['params'],
    addToQueueTime: Date.now(),
    startTime: 0,
    endTime: 0
  }
}

const flush = async () => new Promise((resolve) => setImmediate(resolve))

type Queue = typeof import('../downloadqueue')
let dm: Queue

beforeEach(async () => {
  new Store({ cwd: 'store', name: 'download-manager' }).clear()
  pending.clear()
  jest.resetModules()
  // Fresh registry: refetch the mocks.
  const utils = await import('../utils')
  install = utils.installQueueElement as typeof install
  update = utils.updateQueueElement as typeof update
  forget = (await import('backend/storeManagers/steam/backlog'))
    .forgetSteamInstall as typeof forget
  const run = async (params: { appName: string }) =>
    new Promise<{ status: DMStatus }>((resolve) =>
      pending.set(params.appName, (status) => resolve({ status }))
    )
  install.mockImplementation(run)
  update.mockImplementation(run)
  dm = await import('../downloadqueue')
})

const queued = () =>
  dm.getQueueInformation().elements.map((e) => e.params.appName)

async function pauseFirstDownload() {
  await dm.addToQueue(element('paused'))
  await flush()
  dm.pauseCurrentDownload()
  pending.get('paused')!('abort')
  await flush()
  expect(dm.isPaused()).toBe(true)
}

describe('starting a download while one is paused', () => {
  it('starts the new one and queues the paused one', async () => {
    await pauseFirstDownload()

    await dm.addToQueue(element('new'), { userStarted: true })
    await flush()

    expect(queued()).toEqual(['new', 'paused'])
    expect(dm.getQueueInformation().elements[1].pausedAt).toBeDefined()
    expect(dm.isRunning()).toBe(true)
    expect(install).toHaveBeenLastCalledWith(
      expect.objectContaining({ appName: 'new' })
    )
  })

  it('resumes the paused one after the new one finishes', async () => {
    await pauseFirstDownload()
    await dm.addToQueue(element('new'), { userStarted: true })
    await flush()

    pending.get('new')!('done')
    await flush()

    expect(queued()).toEqual(['paused'])
    expect(dm.getQueueInformation().elements[0].pausedAt).toBeUndefined()
    expect(install).toHaveBeenLastCalledWith(
      expect.objectContaining({ appName: 'paused' })
    )
  })

  it('cancels the queued paused game and its files', async () => {
    await pauseFirstDownload()
    await dm.addToQueue(element('new'), { userStarted: true })
    await flush()

    dm.cancelQueuedDownload('paused', true)

    expect(queued()).toEqual(['new'])
    expect(forget).toHaveBeenCalledWith('paused', true)
    expect(dm.isRunning()).toBe(true)
  })

  it('still appends while a download runs', async () => {
    await dm.addToQueue(element('first'))
    await flush()
    await dm.addToQueue(element('second'))

    expect(queued()).toEqual(['first', 'second'])
    expect(dm.getQueueInformation().elements[1].pausedAt).toBeUndefined()
  })
})

describe('auto-updates', () => {
  it('queue behind a paused download instead of replacing it', async () => {
    await pauseFirstDownload()

    // autoUpdate adds without awaiting.
    await Promise.all([
      dm.addToQueue(element('a', 'update')),
      dm.addToQueue(element('b', 'update')),
      dm.addToQueue(element('c', 'update'))
    ])

    expect(queued()).toEqual(['paused', 'a', 'b', 'c'])
    expect(dm.isPaused()).toBe(true)
    expect(
      dm.getQueueInformation().elements.filter((e) => e.pausedAt)
    ).toHaveLength(0)
  })

  it('keep user downloads in start order when added together', async () => {
    await pauseFirstDownload()

    await Promise.all([
      dm.addToQueue(element('x'), { userStarted: true }),
      dm.addToQueue(element('y'), { userStarted: true })
    ])
    await flush()

    expect(queued()).toEqual(['x', 'paused', 'y'])
    expect(
      dm.getQueueInformation().elements.map((e) => Boolean(e.pausedAt))
    ).toEqual([false, true, false])
  })

  it('remember a failed update until the user retries', async () => {
    await dm.addToQueue(element('rust', 'update'))
    await flush()
    pending.get('rust')!('error')
    await flush()

    expect(dm.hasFailedUpdate('rust', 'steam')).toBe(true)

    await dm.addToQueue(element('rust', 'update'), { userStarted: true })
    expect(dm.hasFailedUpdate('rust', 'steam')).toBe(false)
  })
})
