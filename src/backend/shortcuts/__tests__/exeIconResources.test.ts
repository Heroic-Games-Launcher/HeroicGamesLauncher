import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { decodeIconBitmap, readExeIconResources } from '../exeIconResources'

// Minimal PE with a real resource tree: group #1 -> icon #7, language 1033.
function executable(icon: Buffer, pe64 = false) {
  const file = Buffer.alloc(2048)
  file.write('MZ')
  file.writeUInt32LE(128, 60)
  file.writeUInt32LE(0x4550, 128)
  file.writeUInt16LE(1, 134)
  const optionalSize = pe64 ? 240 : 224
  file.writeUInt16LE(optionalSize, 148)
  const optional = 152
  file.writeUInt16LE(pe64 ? 0x20b : 0x10b, optional)
  const directory = optional + (pe64 ? 112 : 96)
  file.writeUInt32LE(16, directory - 4)
  file.writeUInt32LE(0x2000, directory + 16)
  file.writeUInt32LE(1024, directory + 20)
  const section = optional + optionalSize
  file.write('.rsrc', section)
  file.writeUInt32LE(1024, section + 8)
  file.writeUInt32LE(0x2000, section + 12)
  file.writeUInt32LE(1024, section + 16)
  file.writeUInt32LE(512, section + 20)
  const r = file.subarray(512)
  const directoryEntry = (
    offset: number,
    children: [number, number, boolean][]
  ) => {
    r.writeUInt16LE(children.length, offset + 14)
    children.forEach(([id, target, isDirectory], i) => {
      r.writeUInt32LE(id, offset + 16 + i * 8)
      r.writeUInt32LE(
        (target | (isDirectory ? 0x80000000 : 0)) >>> 0,
        offset + 20 + i * 8
      )
    })
  }
  directoryEntry(0, [
    [3, 32, true],
    [14, 80, true]
  ])
  directoryEntry(32, [[7, 56, true]])
  directoryEntry(56, [[1033, 128, false]])
  directoryEntry(80, [[1, 104, true]])
  directoryEntry(104, [[1033, 144, false]])
  r.writeUInt32LE(0x2000 + 256, 128)
  r.writeUInt32LE(icon.length, 132)
  r.writeUInt32LE(0x2000 + 176, 144)
  r.writeUInt32LE(20, 148)
  r.writeUInt16LE(1, 178)
  r.writeUInt16LE(1, 180)
  r[182] = 32
  r[183] = 32
  r.writeUInt16LE(32, 188)
  r.writeUInt32LE(icon.length, 190)
  r.writeUInt16LE(7, 194)
  icon.copy(r, 256)
  return file
}

function bitmap(depth: number, alpha = 0) {
  const colors = depth <= 8 ? 2 ** depth : 0
  const start = 40 + colors * 4
  const data = Buffer.alloc(start + 8)
  data.writeUInt32LE(40, 0)
  data.writeInt32LE(1, 4)
  data.writeInt32LE(2, 8)
  data.writeUInt16LE(1, 12)
  data.writeUInt16LE(depth, 14)
  if (colors) {
    data.set([10, 20, 30, 0], 44)
    data[start] = 1 << (8 - depth)
  } else {
    data.set([10, 20, 30, alpha], start)
  }
  return data
}

describe('EXE icon resources', () => {
  let folder: string
  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'heroic-icons-'))
  })
  afterEach(async () => {
    await rm(folder, { recursive: true, force: true })
  })

  test.each([false, true])(
    'reads the primary icon from PE64=%s',
    async (pe64) => {
      const icon = bitmap(32)
      const path = join(folder, 'a game.exe')
      await writeFile(path, executable(icon, pe64))
      expect(await readExeIconResources(path)).toEqual([icon])
    }
  )

  test('does not treat non-PE files as executables', async () => {
    const path = join(folder, 'fake.exe')
    await writeFile(path, Buffer.alloc(64))
    expect(await readExeIconResources(path)).toEqual([])
  })

  test('rejects resource directories outside the section', async () => {
    const path = join(folder, 'bad.exe')
    const data = executable(bitmap(32))
    data.writeUInt32LE(0x8000ffff, 512 + 20)
    await writeFile(path, data)
    await expect(readExeIconResources(path)).rejects.toThrow(
      'Invalid PE resource range'
    )
  })

  test('rejects truncated files', async () => {
    const path = join(folder, 'bad.exe')
    await writeFile(path, Buffer.from('MZ'))
    await expect(readExeIconResources(path)).rejects.toThrow(
      'Invalid PE file range'
    )
  })

  test.each([0xffffffff, 5 * 1024 * 1024])(
    'skips a damaged primary image (%i) and reads the smaller image',
    async (size) => {
      const icon = bitmap(32)
      const data = executable(icon)
      const r = data.subarray(512)
      r.writeUInt16LE(2, 32 + 14)
      r.writeUInt32LE(0x80000140, 52) // icon #7 language directory at 320
      r.writeUInt32LE(8, 56)
      r.writeUInt32LE(0x80000158, 60) // icon #8 language directory at 344
      for (const [directory, target] of [
        [320, 128],
        [344, 368]
      ]) {
        r.writeUInt16LE(1, directory + 14)
        r.writeUInt32LE(1033, directory + 16)
        r.writeUInt32LE(target, directory + 20)
      }
      r.writeUInt32LE(size, 132)
      r.writeUInt32LE(34, 148) // group header plus two entries
      r.writeUInt16LE(2, 180)
      r[196] = 16
      r[197] = 16
      r.writeUInt16LE(32, 202)
      r.writeUInt32LE(icon.length, 204)
      r.writeUInt16LE(8, 208)
      r.writeUInt32LE(0x2000 + 448, 368)
      r.writeUInt32LE(icon.length, 372)
      icon.copy(r, 448)
      const path = join(folder, 'damaged.exe')
      await writeFile(path, data)
      expect(await readExeIconResources(path)).toEqual([icon])
    }
  )

  test('does not allocate an oversized resource section', async () => {
    const data = executable(bitmap(32))
    data.writeUInt32LE(33 * 1024 * 1024, 152 + 96 + 20)
    const path = join(folder, 'huge.exe')
    await writeFile(path, data)
    expect(await readExeIconResources(path)).toEqual([])
  })

  test('handles a truncated icon group', async () => {
    const data = executable(bitmap(32))
    data.writeUInt32LE(5, 512 + 148)
    const path = join(folder, 'bad-group.exe')
    await writeFile(path, data)
    expect(await readExeIconResources(path)).toEqual([])
  })

  test.each([1, 4, 8, 24, 32])('decodes legacy %i-bit icons', (depth) => {
    const decoded = decodeIconBitmap(bitmap(depth))
    expect(decoded.width).toBe(1)
    expect(decoded.height).toBe(1)
    expect([...decoded.pixels]).toEqual([10, 20, 30, 255])
  })

  test('applies the AND transparency mask to legacy icons', () => {
    const data = bitmap(8)
    data[data.length - 4] = 0x80
    expect([...decodeIconBitmap(data).pixels]).toEqual([0, 0, 0, 0])
  })

  test('preserves and premultiplies 32-bit alpha', () => {
    expect([...decodeIconBitmap(bitmap(32, 128)).pixels]).toEqual([
      5, 10, 15, 128
    ])
  })

  test('uses 32-bit alpha instead of an obsolete AND mask', () => {
    const data = bitmap(32, 128)
    data[data.length - 4] = 0x80
    expect([...decodeIconBitmap(data).pixels]).toEqual([5, 10, 15, 128])
  })

  test('decodes bottom-up rows with padded scan lines', () => {
    const data = Buffer.alloc(56)
    data.writeUInt32LE(40)
    data.writeInt32LE(1, 4)
    data.writeInt32LE(4, 8)
    data.writeUInt16LE(1, 12)
    data.writeUInt16LE(24, 14)
    data.set([10, 20, 30], 40)
    data.set([40, 50, 60], 44)
    expect([...decodeIconBitmap(data).pixels]).toEqual([
      40, 50, 60, 255, 10, 20, 30, 255
    ])
  })

  test('rejects invalid bitmap dimensions and truncated data', () => {
    const data = bitmap(32)
    data.writeInt32LE(10000, 4)
    expect(() => decodeIconBitmap(data)).toThrow('Unsupported icon bitmap')
    expect(() => decodeIconBitmap(Buffer.alloc(20))).toThrow(
      'Truncated icon bitmap'
    )
    expect(() => decodeIconBitmap(bitmap(8).subarray(0, 44))).toThrow(
      'Truncated icon pixels'
    )
  })
})
