import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { GameInfo } from 'common/types'
import { downloadFile } from 'backend/utils'
import { getIcon } from '../utils'

let mockIconsFolder = ''
jest.mock('backend/constants/paths', () => ({
  get heroicIconFolder() {
    return mockIconsFolder
  }
}))
jest.mock('backend/storeManagers', () => ({ libraryManagerMap: {} }))
jest.mock('backend/utils', () => ({ downloadFile: jest.fn() }))
jest.mock('backend/logger')

const game = (art_square: string) =>
  ({
    app_name: 'game',
    runner: 'sideload',
    art_square,
    install: {}
  }) as GameInfo

describe('getIcon', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-icons-'))
    mockIconsFolder = join(root, 'icons')
    jest.mocked(downloadFile).mockReset()
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  test('copies art picked from disk', async () => {
    mkdirSync(join(root, 'My Art'))
    const art = join(root, 'My Art', 'cover.png')
    writeFileSync(art, 'picked')

    const icon = await getIcon('game', game(`file://${art}`))

    expect(readFileSync(icon, 'utf-8')).toBe('picked')
    expect(downloadFile).not.toHaveBeenCalled()
  })

  test('waits for downloaded art', async () => {
    jest.mocked(downloadFile).mockImplementation(async ({ dest }) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      writeFileSync(dest, 'downloaded')
    })

    const icon = await getIcon('game', game('https://example.com/a b.jpg'))

    expect(downloadFile).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com/a%20b.jpg' })
    )
    expect(readFileSync(icon, 'utf-8')).toBe('downloaded')
  })

  test('reuses the icon while the art is the same', async () => {
    jest.mocked(downloadFile).mockImplementation(async ({ dest }) => {
      writeFileSync(dest, 'downloaded')
    })

    await getIcon('game', game('https://example.com/a.jpg'))
    await getIcon('game', game('https://example.com/a.jpg'))

    expect(downloadFile).toHaveBeenCalledTimes(1)
  })

  test('replaces the icon when the art changes', async () => {
    const first = join(root, 'first.png')
    const second = join(root, 'second.png')
    writeFileSync(first, 'first')
    writeFileSync(second, 'second')

    await getIcon('game', game(`file://${first}`))
    const icon = await getIcon('game', game(`file://${second}`))

    expect(readFileSync(icon, 'utf-8')).toBe('second')
  })

  test('still returns the icon path when the art is unavailable', async () => {
    jest.mocked(downloadFile).mockRejectedValue(new Error('offline'))

    await expect(
      getIcon('game', game('https://example.com/a.jpg'))
    ).resolves.toBe(join(root, 'icons', 'game.jpg'))
  })
})
