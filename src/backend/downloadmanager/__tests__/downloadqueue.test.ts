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
let forget: jest.MockedFunction<Backlog['forgetSteamInstall']>

// One open install per app.
const pending = new Map<string, (status: DMStatus) => void>()

function element(appName: string): DMQueueElement {
  return {
    type: 'install',
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
  install = (await import('../utils')).installQueueElement as typeof install
  forget = (await import('backend/storeManagers/steam/backlog'))
    .forgetSteamInstall as typeof forget
  install.mockImplementation(
    async (params) =>
      new Promise((resolve) =>
        pending.set(params.appName, (status) => resolve({ status }))
      )
  )
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

    await dm.addToQueue(element('new'))
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
    await dm.addToQueue(element('new'))
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
    await dm.addToQueue(element('new'))
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
