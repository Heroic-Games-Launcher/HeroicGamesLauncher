import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  utimes,
  writeFile
} from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { nativeImage } from 'electron'
import { getExeIcon, resolveIconExecutable } from '../exeIcon'
import { readExeIconResources } from '../exeIconResources'

let mockFolder: string
const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082',
  'hex'
)
jest.mock('electron', () => ({
  nativeImage: { createFromBuffer: jest.fn(), createFromBitmap: jest.fn() }
}))
jest.mock('backend/constants/paths', () => ({
  get heroicIconFolder() {
    return mockFolder
  }
}))
jest.mock('backend/logger', () => ({ logWarning: jest.fn(), LogPrefix: {} }))
jest.mock('../exeIconResources', () => ({
  readExeIconResources: jest.fn(),
  decodeIconBitmap: jest.fn()
}))

describe('EXE icon extraction and cache', () => {
  let folder: string
  let executable: string
  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'heroic-exe-cache-'))
    mockFolder = join(folder, 'icons')
    executable = join(folder, 'A Game.EXE')
    await writeFile(executable, 'MZ')
    jest.mocked(readExeIconResources).mockResolvedValue([png])
    jest.mocked(nativeImage.createFromBuffer).mockImplementation(
      (data) =>
        ({
          isEmpty: () => !data.equals(png),
          toPNG: () => png
        }) as Electron.NativeImage
    )
  })
  afterEach(async () => {
    await rm(folder, { recursive: true, force: true })
  })

  test('writes a PNG atomically and reuses a valid cache', async () => {
    const icon = await getExeIcon(executable)
    expect(icon).toMatch(/exe-.*\.png$/)
    expect(await readFile(icon!)).toEqual(png)
    expect(await getExeIcon(executable)).toBe(icon)
    expect(readExeIconResources).toHaveBeenCalledTimes(1)
    expect(
      (await readdir(mockFolder)).filter((name) => name.endsWith('.tmp'))
    ).toEqual([])
  })
  test('regenerates corrupt cache files', async () => {
    const icon = (await getExeIcon(executable))!
    await writeFile(icon, 'broken png')
    expect(await getExeIcon(executable)).toBe(icon)
    expect(await readFile(icon)).toEqual(png)
    expect(readExeIconResources).toHaveBeenCalledTimes(2)
  })
  test('invalidates the cache when the executable changes', async () => {
    const first = await getExeIcon(executable)
    const source = await stat(executable)
    await utimes(executable, source.atime, new Date(source.mtimeMs + 10000))
    expect(await getExeIcon(executable)).not.toBe(first)
  })
  test('deduplicates concurrent extraction requests', async () => {
    const icons = await Promise.all(
      Array.from({ length: 10 }, () => getExeIcon(executable))
    )
    expect(new Set(icons).size).toBe(1)
    expect(icons[0]).toBeDefined()
    expect(readExeIconResources).toHaveBeenCalledTimes(1)
  })
  test('tries a smaller image if the largest image is corrupt', async () => {
    jest.mocked(readExeIconResources).mockResolvedValue([Buffer.alloc(24), png])
    expect(await getExeIcon(executable)).toBeDefined()
  })
  test('returns undefined for malformed resources without rejecting', async () => {
    jest.mocked(readExeIconResources).mockRejectedValue(new Error('Invalid PE'))
    await expect(getExeIcon(executable)).resolves.toBeUndefined()
  })
  test('returns undefined when the EXE has no icon', async () => {
    jest.mocked(readExeIconResources).mockResolvedValue([])
    await expect(getExeIcon(executable)).resolves.toBeUndefined()
  })
  test('falls back when the cache directory is unwritable', async () => {
    await writeFile(mockFolder, 'not a directory')
    await expect(getExeIcon(executable)).resolves.toBeUndefined()
  })
  test('cleans up temporary files after a failed atomic rename', async () => {
    const icon = (await getExeIcon(executable))!
    await rm(icon)
    await mkdir(icon)
    await expect(getExeIcon(executable)).resolves.toBeUndefined()
    expect(
      (await readdir(mockFolder)).filter((name) => name.endsWith('.tmp'))
    ).toEqual([])
  })
  test('ignores missing files, directories, and non-EXE files', async () => {
    await expect(
      getExeIcon(join(folder, 'missing.exe'))
    ).resolves.toBeUndefined()
    await mkdir(join(folder, 'directory.exe'))
    await expect(
      getExeIcon(join(folder, 'directory.exe'))
    ).resolves.toBeUndefined()
    await expect(getExeIcon('/games/LinuxGame')).resolves.toBeUndefined()
    expect(readExeIconResources).not.toHaveBeenCalled()
  })
  test('rejects oversized embedded PNG dimensions before decoding', async () => {
    const large = Buffer.from(png)
    large.writeUInt32BE(10000, 16)
    jest.mocked(readExeIconResources).mockResolvedValue([large])
    await expect(getExeIcon(executable)).resolves.toBeUndefined()
    expect(nativeImage.createFromBuffer).not.toHaveBeenCalled()
  })
})

test.each([
  ['/games/A Game.exe', undefined, '/games/A Game.exe'],
  ['bin\\Game.exe', '/games/Title', '/games/Title/bin/Game.exe'],
  ['bin/Game.exe', '/games/Title', '/games/Title/bin/Game.exe'],
  ['Game.exe', undefined, undefined]
])('resolves executable %s against %s', (exe, base, expected) => {
  expect(resolveIconExecutable(exe, base)).toBe(expected)
})
