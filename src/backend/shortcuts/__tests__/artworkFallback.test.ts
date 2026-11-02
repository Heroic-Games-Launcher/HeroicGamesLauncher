import { nativeImage } from 'electron'
import axios from 'axios'
import { existsSync } from 'graceful-fs'
import { getIcon } from '../utils'
import { readIconFile, writeIconPng } from '../iconCache'
import { libraryManagerMap } from 'backend/storeManagers'
import type { GameInfo } from 'common/types'

jest.mock('electron', () => ({
  nativeImage: { createFromBuffer: jest.fn(), createFromDataURL: jest.fn() }
}))
jest.mock('axios', () => ({ get: jest.fn() }))
jest.mock('graceful-fs', () => ({ existsSync: jest.fn() }))
jest.mock('backend/constants/paths', () => ({
  heroicIconFolder: '/icons',
  windowIcon: '/bundled/icon.png'
}))
jest.mock('backend/storeManagers', () => ({
  libraryManagerMap: { gog: { getProductApi: jest.fn() } }
}))
jest.mock('backend/utils', () => ({ downloadFile: jest.fn() }))
jest.mock('backend/utils/aborthandler/aborthandler', () => ({
  createAbortController: jest.fn()
}))
jest.mock('backend/logger', () => ({ logWarning: jest.fn(), LogPrefix: {} }))
jest.mock('../iconCache', () => ({
  maxIconBytes: 8 * 1024 * 1024,
  readIconFile: jest.fn(),
  writeIconPng: jest.fn()
}))

const game = {
  app_name: 'id',
  runner: 'sideload',
  art_square: 'https://example.test/icon.jpg',
  install: {}
} as GameInfo
const cached = Buffer.from('image')

describe('shortcut artwork fallback', () => {
  beforeEach(() => {
    jest.mocked(existsSync).mockReturnValue(true)
    jest
      .mocked(readIconFile)
      .mockImplementation((path) =>
        Promise.resolve(
          path === '/icons/heroic-default.png' ? cached : undefined
        )
      )
    jest.mocked(writeIconPng).mockResolvedValue(undefined)
    jest.mocked(axios.get).mockResolvedValue({ data: cached })
    const image = {
      isEmpty: () => false,
      toPNG: () => cached,
      resize: () => image
    } as unknown as Electron.NativeImage
    jest.mocked(nativeImage.createFromBuffer).mockReturnValue(image)
    jest.mocked(nativeImage.createFromDataURL).mockReturnValue(image)
  })
  test('awaits artwork download and publishing before returning the icon', async () => {
    const icon = await getIcon('id', game)
    expect(icon).toMatch(/^\/icons\/artwork-.*\.png$/)
    expect(axios.get).toHaveBeenCalledWith(
      game.art_square,
      expect.objectContaining({
        timeout: 10000,
        maxContentLength: 8 * 1024 * 1024,
        signal: expect.any(AbortSignal)
      })
    )
    expect(writeIconPng).toHaveBeenCalledWith(icon, cached)
  })
  test('uses the existing JPG path when there is no PNG cache', async () => {
    jest
      .mocked(readIconFile)
      .mockImplementation((path) =>
        Promise.resolve(path === '/icons/id.jpg' ? cached : undefined)
      )
    expect(await getIcon('id', game)).toBe('/icons/id.jpg')
    expect(axios.get).not.toHaveBeenCalled()
  })
  test.each(['offline', 'timeout', 'HTTP 404'])(
    'uses the bundled icon after %s',
    async (message) => {
      jest.mocked(axios.get).mockRejectedValue(new Error(message))
      expect(await getIcon('id', game)).toBe('/icons/heroic-default.png')
    }
  )
  test('uses the bundled icon when no artwork is provided', async () => {
    expect(await getIcon('id', { ...game, art_square: '' })).toBe(
      '/icons/heroic-default.png'
    )
    expect(axios.get).not.toHaveBeenCalled()
  })
  test('uses the bundled icon when a cached or downloaded image is corrupt', async () => {
    jest
      .mocked(nativeImage.createFromBuffer)
      .mockReturnValue({ isEmpty: () => true } as Electron.NativeImage)
    expect(await getIcon('id', game)).toBe('/icons/heroic-default.png')
    expect(writeIconPng).not.toHaveBeenCalled()
  })
  test('uses the bundled icon when the icon cache cannot be written', async () => {
    jest.mocked(writeIconPng).mockRejectedValue(new Error('disk full'))
    expect(await getIcon('id', game)).toBe('/icons/heroic-default.png')
  })
  test('supports custom data URL artwork without a network request', async () => {
    expect(
      await getIcon('id', { ...game, art_square: 'data:image/png;base64,abc' })
    ).toMatch(/artwork-/)
    expect(nativeImage.createFromDataURL).toHaveBeenCalled()
    expect(axios.get).not.toHaveBeenCalled()
  })
  test('supports existing local artwork paths with spaces', async () => {
    jest
      .mocked(readIconFile)
      .mockImplementation((path) =>
        Promise.resolve(path === '/games/An Icon.png' ? cached : undefined)
      )
    expect(
      await getIcon('id', {
        ...game,
        art_square: 'file:///games/An%20Icon.png'
      })
    ).toBe('/games/An Icon.png')
  })
  test('rejects unsupported URL protocols', async () => {
    expect(
      await getIcon('id', {
        ...game,
        art_square: 'ftp://example.test/icon.png'
      })
    ).toBe('/icons/heroic-default.png')
    expect(axios.get).not.toHaveBeenCalled()
  })
  test('continues with ordinary artwork if GOG metadata fails', async () => {
    jest
      .mocked(libraryManagerMap.gog.getProductApi)
      .mockRejectedValue(new Error('offline'))
    expect(await getIcon('id', { ...game, runner: 'gog' })).toMatch(/artwork-/)
  })
  test('bounds stalled GOG metadata requests', async () => {
    jest.useFakeTimers()
    try {
      jest
        .mocked(libraryManagerMap.gog.getProductApi)
        .mockReturnValue(new Promise(() => undefined))
      const icon = getIcon('id', { ...game, runner: 'gog', art_square: '' })
      await jest.advanceTimersByTimeAsync(10000)
      expect(await icon).toBe('/icons/heroic-default.png')
    } finally {
      jest.useRealTimers()
    }
  })
  test('uses a standard themed icon if bundled resources are missing', async () => {
    jest.mocked(readIconFile).mockResolvedValue(undefined)
    expect(await getIcon('id', { ...game, art_square: '' })).toBe(
      'application-x-executable'
    )
  })

  test('copies sandbox-only bundled icons into a persistent cache', async () => {
    jest
      .mocked(readIconFile)
      .mockImplementation((path) =>
        Promise.resolve(path === '/bundled/icon.png' ? cached : undefined)
      )
    expect(await getIcon('id', { ...game, art_square: '' })).toBe(
      '/icons/heroic-default.png'
    )
    expect(writeIconPng).toHaveBeenCalledWith(
      '/icons/heroic-default.png',
      cached
    )
  })

  test('uses a themed icon if even the bundled icon cannot be copied', async () => {
    jest
      .mocked(readIconFile)
      .mockImplementation((path) =>
        Promise.resolve(path === '/bundled/icon.png' ? cached : undefined)
      )
    jest.mocked(writeIconPng).mockRejectedValue(new Error('read-only cache'))
    expect(await getIcon('id', { ...game, art_square: '' })).toBe(
      'application-x-executable'
    )
  })
})
