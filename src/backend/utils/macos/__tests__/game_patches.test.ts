import {
  closeSync,
  ftruncateSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  writeSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { GAME_PATCHES, syncGamePatches } from '../game_patches'

const hellblade = GAME_PATCHES.find(({ id }) => id === 'hellblade2-162837')!

function readHex(path: string, offset: number, length: number) {
  const fd = openSync(path, 'r')
  const buffer = Buffer.alloc(length)
  readSync(fd, buffer, 0, length, offset)
  closeSync(fd)
  return buffer.toString('hex')
}

describe('syncGamePatches', () => {
  let gameRoot: string
  let exe: string

  // A sparse file of the exact size with the original bytes at every offset
  function createExe(size = hellblade.size) {
    mkdirSync(dirname(exe), { recursive: true })
    const fd = openSync(exe, 'w')
    ftruncateSync(fd, size)
    for (const { offset, original } of hellblade.patches) {
      if (offset < size)
        writeSync(
          fd,
          Buffer.from(original, 'hex'),
          0,
          original.length / 2,
          offset
        )
    }
    closeSync(fd)
  }

  beforeEach(() => {
    gameRoot = mkdtempSync(join(tmpdir(), 'heroic-patches-'))
    exe = join(gameRoot, hellblade.file)
  })

  afterEach(() => rmSync(gameRoot, { recursive: true, force: true }))

  test('patches the known build and restores it byte for byte', async () => {
    createExe()

    expect(await syncGamePatches([gameRoot], true)).toEqual([
      expect.stringContaining('Patched')
    ])
    for (const { offset, patched } of hellblade.patches) {
      expect(readHex(exe, offset, patched.length / 2)).toBe(patched)
    }

    expect(await syncGamePatches([gameRoot], true)).toEqual([])

    expect(await syncGamePatches([gameRoot], false)).toEqual([
      expect.stringContaining('Restored')
    ])
    for (const { offset, original } of hellblade.patches) {
      expect(readHex(exe, offset, original.length / 2)).toBe(original)
    }
    expect(await syncGamePatches([gameRoot], false)).toEqual([])
  })

  test('leaves other builds and unexpected bytes alone', async () => {
    createExe(hellblade.size - 1)
    expect(await syncGamePatches([gameRoot], true)).toEqual([
      expect.stringContaining('different build')
    ])
    expect(await syncGamePatches([gameRoot], false)).toEqual([])

    createExe()
    const fd = openSync(exe, 'r+')
    writeSync(fd, Buffer.from('cc', 'hex'), 0, 1, hellblade.patches[0].offset)
    closeSync(fd)
    expect(await syncGamePatches([gameRoot], true)).toEqual([
      expect.stringContaining('unexpected bytes')
    ])
    expect(readHex(exe, hellblade.patches[1].offset, 1)).toBe(
      hellblade.patches[1].original.slice(0, 2)
    )
  })

  test('does nothing for games without patches', async () => {
    expect(await syncGamePatches([gameRoot], true)).toEqual([])
  })
})
