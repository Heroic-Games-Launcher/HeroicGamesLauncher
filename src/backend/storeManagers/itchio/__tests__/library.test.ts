import type { ItchioGame } from 'common/types/itchio'

import ItchioLibraryManager from '../library'

const mockCall = jest.fn<Promise<unknown>, [string, Record<string, unknown>]>()
const mockLibrarySet = jest.fn<void, [string, unknown]>()
const mockGetNodefault = jest.fn<number | undefined, [string]>()

jest.mock('../butlerd', () => ({
  getClient: () => Promise.resolve({ call: mockCall })
}))
jest.mock('../electronStores', () => ({
  configStore: {
    get_nodefault: (key: string) => mockGetNodefault(key)
  },
  installStore: { get: jest.fn(), set: jest.fn() },
  libraryStore: {
    get: () => [],
    set: (key: string, value: unknown) => mockLibrarySet(key, value)
  }
}))
jest.mock('../user', () => ({
  ItchioUser: { isLoggedIn: () => true }
}))
jest.mock('../setup', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('../games', () => ({ __esModule: true, default: class {} }))
jest.mock('../constants', () => ({
  butlerDbPath: '/tmp/itchio/butler.db',
  itchioStoreConfigPath: '/tmp/itchio/config.json'
}))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn(),
  LogPrefix: { Itchio: 'Itchio' }
}))
jest.mock('backend/constants/environment', () => ({ isLinux: true }))
jest.mock('backend/importExport/constants', () => ({ BACKUP_PATHS: {} }))

type ButlerdHandler = (params: Record<string, unknown>) => unknown

function mockButlerd(handlers: Record<string, ButlerdHandler>) {
  mockCall.mockImplementation((method, params) => {
    const handler = handlers[method]
    if (!handler) {
      return Promise.reject(new Error(`unexpected butlerd method ${method}`))
    }
    return Promise.resolve(handler(params))
  })
}

function makeGame(id: number, title: string): ItchioGame {
  return {
    id,
    title,
    url: `https://example.itch.io/${id}`,
    user: { id: 1, username: 'dev', url: 'https://example.itch.io' },
    platforms: { windows: true },
    owned_dlc: []
  }
}

function refreshedLibrary(): Array<{ app_name: string; title: string }> {
  const call = mockLibrarySet.mock.calls.find(([key]) => key === 'library')
  expect(call).toBeDefined()
  return call![1] as Array<{ app_name: string; title: string }>
}

const winUpload = {
  id: 5,
  filename: 'game.zip',
  size: 1234,
  platforms: { windows: true }
}

beforeEach(() => {
  mockGetNodefault.mockReturnValue(42)
})

describe('itch.io library refresh', () => {
  it('merges owned keys, bundle games and the named discovery collections', async () => {
    mockButlerd({
      'Fetch.ProfileOwnedKeys': () => ({
        items: [{ id: 1, gameId: 10, game: makeGame(10, 'Owned') }]
      }),
      'Fetch.ProfileBundleOwnerships': () => ({}),
      'Fetch.ProfileOwnedBundles': () => ({
        items: [{ bundleId: 100, bundle: { id: 100, title: 'Bundle' } }]
      }),
      'Fetch.BundleGames': () => ({
        items: [{ bundleId: 100, gameId: 11, game: makeGame(11, 'Bundled') }]
      }),
      'Fetch.ProfileCollections': () => ({
        items: [
          { id: 7, title: 'jams' },
          { id: 8, title: ' Heroic ' }
        ]
      }),
      'Fetch.Collection.Games': (params) => {
        expect(params.collectionId).toBe(8)
        return {
          items: [
            { collectionId: 8, gameId: 12, game: makeGame(12, 'Collected') }
          ]
        }
      }
    })

    await new ItchioLibraryManager().refresh()

    expect(
      refreshedLibrary()
        .map((game) => game.title)
        .sort()
    ).toEqual(['Bundled', 'Collected', 'Owned'])
  })

  it('dedupes a game that is both an owned key and a bundle game', async () => {
    mockButlerd({
      'Fetch.ProfileOwnedKeys': () => ({
        items: [{ id: 1, gameId: 10, game: makeGame(10, 'Owned') }]
      }),
      'Fetch.ProfileBundleOwnerships': () => ({}),
      'Fetch.ProfileOwnedBundles': () => ({
        items: [{ bundleId: 100, bundle: { id: 100, title: 'Bundle' } }]
      }),
      'Fetch.BundleGames': () => ({
        items: [{ bundleId: 100, gameId: 10, game: makeGame(10, 'Owned') }]
      }),
      'Fetch.ProfileCollections': () => ({
        items: [
          { id: 8, title: 'lutris' },
          { id: 9, title: 'not-ours' }
        ]
      }),
      'Fetch.Collection.Games': () => ({
        items: [{ collectionId: 8, gameId: 10, game: makeGame(10, 'Owned') }]
      })
    })

    await new ItchioLibraryManager().refresh()

    expect(refreshedLibrary()).toHaveLength(1)
  })

  it('keeps the owned games when the bundle/collection sources fail', async () => {
    mockButlerd({
      'Fetch.ProfileOwnedKeys': () => ({
        items: [{ id: 1, gameId: 10, game: makeGame(10, 'Owned') }]
      }),
      'Fetch.ProfileBundleOwnerships': () => {
        throw new Error('Method not found')
      },
      'Fetch.ProfileOwnedBundles': () => {
        throw new Error('Method not found')
      },
      'Fetch.ProfileCollections': () => ({
        items: [{ id: 8, title: 'heroic' }]
      }),
      'Fetch.Collection.Games': () => ({
        items: [
          { collectionId: 8, gameId: 12, game: makeGame(12, 'Collected') }
        ]
      })
    })

    await new ItchioLibraryManager().refresh()

    expect(
      refreshedLibrary()
        .map((game) => game.title)
        .sort()
    ).toEqual(['Collected', 'Owned'])
  })
})

describe('itch.io install info', () => {
  async function seedLibrary(gameId: number) {
    mockButlerd({
      'Fetch.ProfileOwnedKeys': () => ({
        items: [{ id: 2, gameId, game: makeGame(gameId, 'Bundled') }]
      }),
      'Fetch.ProfileBundleOwnerships': () => ({}),
      'Fetch.ProfileOwnedBundles': () => ({ items: [] }),
      'Fetch.ProfileCollections': () => ({ items: [] })
    })
    await new ItchioLibraryManager().refresh()
    mockLibrarySet.mockClear()
  }

  it('materializes the bundle download key when the view path lists no uploads', async () => {
    await seedLibrary(20)
    const methods: string[] = []
    mockCall.mockImplementation((method: string) => {
      methods.push(method)
      if (method === 'Fetch.GameUploads')
        return Promise.resolve({ uploads: [] })
      if (method === 'Fetch.GameOwnership') {
        return Promise.resolve({ owned: true, bundleId: 9 })
      }
      if (method === 'Install.GetUploads') {
        return Promise.resolve({
          uploads: [],
          incompatibleUploads: [winUpload]
        })
      }
      return Promise.reject(new Error(`unexpected butlerd method ${method}`))
    })

    const info = await new ItchioLibraryManager().getInstallInfo(
      'itchio-20',
      'Windows'
    )

    expect((info as { upload?: unknown } | undefined)?.upload).toEqual(
      winUpload
    )
    expect(methods).toContain('Install.GetUploads')
  })

  it('does not claim anything when the uploads are already listed', async () => {
    await seedLibrary(21)
    const methods: string[] = []
    mockCall.mockImplementation((method: string) => {
      methods.push(method)
      if (method === 'Fetch.GameUploads') {
        return Promise.resolve({ uploads: [winUpload] })
      }
      return Promise.reject(new Error(`unexpected butlerd method ${method}`))
    })

    const info = await new ItchioLibraryManager().getInstallInfo(
      'itchio-21',
      'Windows'
    )

    expect((info as { upload?: unknown } | undefined)?.upload).toEqual(
      winUpload
    )
    expect(methods).not.toContain('Install.GetUploads')
    expect(methods).not.toContain('Fetch.GameOwnership')
  })
})
