import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  addExports,
  D3DKMT_FUNCTIONS,
  enableFrameGenerationInRunner,
  peChecksum,
  readExports,
  runnerOffersFrameGeneration
} from '../d3dkmt'

const OPTIONAL_HEADER = 0x58
const SECTION_HEADERS = OPTIONAL_HEADER + 240

/**
 * A 64-bit DLL with a .text section at RVA 0x1000 and its export table in an
 * .edata section at RVA 0x2000. String targets are forwarders
 */
function buildDll(
  exports: Record<string, number | string>,
  sizeOfHeaders = 0x400
): Buffer {
  const file = Buffer.alloc(0x800)
  file.write('MZ', 0, 'latin1')
  file.writeUInt32LE(0x40, 0x3c)
  file.write('PE\0\0', 0x40, 'latin1')
  file.writeUInt16LE(0x8664, 0x44)
  file.writeUInt16LE(2, 0x46)
  file.writeUInt16LE(240, 0x54)
  file.writeUInt16LE(0x20b, OPTIONAL_HEADER)
  file.writeUInt32LE(0x1000, OPTIONAL_HEADER + 32)
  file.writeUInt32LE(0x200, OPTIONAL_HEADER + 36)
  file.writeUInt32LE(0x3000, OPTIONAL_HEADER + 56)
  file.writeUInt32LE(sizeOfHeaders, OPTIONAL_HEADER + 60)
  file.writeUInt32LE(16, OPTIONAL_HEADER + 108)

  const sections = [
    { name: '.text', rva: 0x1000, raw: 0x400, flags: 0x60000020 },
    { name: '.edata', rva: 0x2000, raw: 0x600, flags: 0x40000040 }
  ]
  sections.forEach(({ name, rva, raw, flags }, i) => {
    const header = SECTION_HEADERS + i * 40
    file.write(name, header, 'latin1')
    file.writeUInt32LE(0x200, header + 8)
    file.writeUInt32LE(rva, header + 12)
    file.writeUInt32LE(0x200, header + 16)
    file.writeUInt32LE(raw, header + 20)
    file.writeUInt32LE(flags, header + 36)
  })
  file.fill(0xc3, 0x400, 0x600)

  const names = Object.keys(exports).sort()
  const dir = 0x600
  let cursor = 40 + names.length * 10
  const addString = (value: string) => {
    const rva = 0x2000 + cursor
    file.write(value + '\0', dir + cursor, 'latin1')
    cursor += value.length + 1
    return rva
  }
  file.writeUInt32LE(0x5eed, dir + 4)
  file.writeUInt32LE(addString('test.dll'), dir + 12)
  file.writeUInt32LE(1, dir + 16)
  file.writeUInt32LE(names.length, dir + 20)
  file.writeUInt32LE(names.length, dir + 24)
  file.writeUInt32LE(0x2000 + 40, dir + 28)
  file.writeUInt32LE(0x2000 + 40 + names.length * 4, dir + 32)
  file.writeUInt32LE(0x2000 + 40 + names.length * 8, dir + 36)
  names.forEach((name, i) => {
    const target = exports[name]
    const rva = typeof target === 'string' ? addString(target) : target
    file.writeUInt32LE(rva, dir + 40 + i * 4)
    file.writeUInt32LE(addString(name), dir + 40 + names.length * 4 + i * 4)
    file.writeUInt16LE(i, dir + 40 + names.length * 8 + i * 2)
  })
  file.writeUInt32LE(0x2000, OPTIONAL_HEADER + 112)
  file.writeUInt32LE(cursor, OPTIONAL_HEADER + 116)
  return file
}

const STOCK_EXPORTS = {
  GdiFlush: 0x1010,
  CreateDCW: 0x1000,
  D3DKMTOpenAdapterFromLuid: 'win32u.NtGdiDdDDIOpenAdapterFromLuid'
}

const code = () =>
  Object.fromEntries(
    Object.entries(D3DKMT_FUNCTIONS).map(([name, build]) => [name, build()])
  )

describe('addExports', () => {
  const stock = buildDll(STOCK_EXPORTS)
  const patched = addExports(stock, code())

  test('reads the export table, forwarders included', () => {
    expect(readExports(stock)).toEqual([
      { name: 'CreateDCW', target: 0x1000 },
      {
        name: 'D3DKMTOpenAdapterFromLuid',
        target: 'win32u.NtGdiDdDDIOpenAdapterFromLuid'
      },
      { name: 'GdiFlush', target: 0x1010 }
    ])
  })

  test('keeps every export and adds the new ones in name order', () => {
    expect(readExports(patched)).toEqual([
      { name: 'CreateDCW', target: 0x1000 },
      { name: 'D3DKMTEnumAdapters2', target: 0x3000 },
      {
        name: 'D3DKMTOpenAdapterFromLuid',
        target: 'win32u.NtGdiDdDDIOpenAdapterFromLuid'
      },
      { name: 'D3DKMTQueryAdapterInfo', target: 0x3050 },
      { name: 'GdiFlush', target: 0x1010 }
    ])
  })

  test('puts the code in a new executable section', () => {
    const header = SECTION_HEADERS + 2 * 40
    expect(patched.readUInt16LE(0x46)).toBe(3)
    expect(patched.toString('latin1', header, header + 8)).toBe('.hkmt\0\0\0')
    expect(patched.readUInt32LE(header + 12)).toBe(0x3000)
    expect(patched.readUInt32LE(header + 20)).toBe(0x800)
    expect(patched.readUInt32LE(header + 36)).toBe(0x60000020)

    const { D3DKMTEnumAdapters2, D3DKMTQueryAdapterInfo } = code()
    expect(patched.subarray(0x800, 0x800 + D3DKMTEnumAdapters2.length)).toEqual(
      D3DKMTEnumAdapters2
    )
    expect(
      patched.subarray(0x850, 0x850 + D3DKMTQueryAdapterInfo.length)
    ).toEqual(D3DKMTQueryAdapterInfo)
  })

  test('updates the image size, export directory and checksum', () => {
    const virtualSize = patched.readUInt32LE(SECTION_HEADERS + 2 * 40 + 8)
    expect(patched.length).toBe(0x800 + Math.ceil(virtualSize / 0x200) * 0x200)
    expect(patched.readUInt32LE(OPTIONAL_HEADER + 56)).toBe(
      Math.ceil((0x3000 + virtualSize) / 0x1000) * 0x1000
    )
    expect(patched.readUInt32LE(OPTIONAL_HEADER + 112)).toBe(0x3090)
    expect(patched.readUInt32LE(OPTIONAL_HEADER + 64)).toBe(peChecksum(patched))
  })

  test('leaves the original sections untouched', () => {
    expect(patched.subarray(0x400, 0x800)).toEqual(stock.subarray(0x400, 0x800))
  })

  test('refuses names that are already exported', () => {
    expect(() => addExports(stock, { GdiFlush: Buffer.from([0xc3]) })).toThrow(
      'GdiFlush is already exported'
    )
  })

  test('refuses DLLs without room for another section header', () => {
    const full = buildDll(STOCK_EXPORTS, SECTION_HEADERS + 2 * 40)
    expect(() => addExports(full, code())).toThrow(
      'no room for another section header'
    )
  })
})

describe('peChecksum', () => {
  test('matches the PE checksum algorithm', () => {
    // Value from pefile's PE.generate_checksum() for this file
    expect(peChecksum(buildDll(STOCK_EXPORTS))).toBe(0x8ddb)
  })
})

describe('D3DKMT functions', () => {
  // Disassembly checked with objdump -m i386:x86-64; see the comments in d3dkmt.ts
  test('D3DKMTEnumAdapters2 machine code', () => {
    expect(D3DKMT_FUNCTIONS.D3DKMTEnumAdapters2().toString('hex')).toBe(
      '4885c97445488b41084885c07427833901722b' +
        'c70001004d4bc74004d1d30000c7400800000000c7400c01000000c7401000000000' +
        'c70101000000' +
        '31c0c3' +
        'c70101000000b8230000c0c3' +
        'b80d0000c0c3'
    )
  })

  test('D3DKMTQueryAdapterInfo machine code', () => {
    expect(D3DKMT_FUNCTIONS.D3DKMTQueryAdapterInfo().toString('hex')).toBe(
      '4885c97432' +
        '813901004d4b752a' +
        '488b51084885d27421' +
        '83790446750f' +
        '83791004720f' +
        'c7020700000031c0c3' +
        'b8bb0000c0c3' +
        'b8230000c0c3' +
        'b80d0000c0c3'
    )
  })
})

describe('enableFrameGenerationInRunner', () => {
  let dllDir: string
  let gdi32: string

  beforeEach(() => {
    dllDir = mkdtempSync(join(tmpdir(), 'heroic-d3dkmt-'))
    gdi32 = join(dllDir, 'gdi32.dll')
  })

  afterEach(() => rmSync(dllDir, { recursive: true, force: true }))

  test('patches gdi32.dll once, keeping the stock one', async () => {
    const stock = buildDll(STOCK_EXPORTS)
    writeFileSync(gdi32, stock)

    expect(await enableFrameGenerationInRunner(dllDir)).toBe('patched')
    expect(readFileSync(join(dllDir, 'gdi32.dll.heroic-stock'))).toEqual(stock)
    const names = readExports(readFileSync(gdi32)).map(({ name }) => name)
    expect(names).toContain('D3DKMTEnumAdapters2')
    expect(names).toContain('D3DKMTQueryAdapterInfo')
    expect(existsSync(join(dllDir, 'gdi32.dll.heroic-new'))).toBe(false)

    const patched = readFileSync(gdi32)
    expect(await enableFrameGenerationInRunner(dllDir)).toBe('ready')
    expect(readFileSync(gdi32)).toEqual(patched)
    expect(readFileSync(join(dllDir, 'gdi32.dll.heroic-stock'))).toEqual(stock)
  })

  test('patches again after a runner update restored a stock gdi32.dll', async () => {
    writeFileSync(gdi32, buildDll(STOCK_EXPORTS))
    await enableFrameGenerationInRunner(dllDir)

    const updated = buildDll({ ...STOCK_EXPORTS, GdiFlush: 0x1020 })
    writeFileSync(gdi32, updated)
    expect(await enableFrameGenerationInRunner(dllDir)).toBe('patched')
    expect(readFileSync(join(dllDir, 'gdi32.dll.heroic-stock'))).toEqual(
      updated
    )
  })

  test('leaves runners with their own D3DKMT adapter functions alone', async () => {
    const native = buildDll({
      ...STOCK_EXPORTS,
      D3DKMTEnumAdapters2: 0x1020,
      D3DKMTQueryAdapterInfo: 0x1030
    })
    writeFileSync(gdi32, native)
    expect(await enableFrameGenerationInRunner(dllDir)).toBe('native')
    expect(readFileSync(gdi32)).toEqual(native)
  })

  test('does not mix its functions with a runner that has only one', async () => {
    const partial = buildDll({
      ...STOCK_EXPORTS,
      D3DKMTQueryAdapterInfo: 0x1030
    })
    writeFileSync(gdi32, partial)
    expect(await enableFrameGenerationInRunner(dllDir)).toBe('unsupported')
    expect(readFileSync(gdi32)).toEqual(partial)
    expect(existsSync(join(dllDir, 'gdi32.dll.heroic-stock'))).toBe(false)
  })

  test('reports runners without a 64-bit gdi32.dll', async () => {
    mkdirSync(join(dllDir, 'empty'))
    expect(await enableFrameGenerationInRunner(join(dllDir, 'empty'))).toBe(
      'unsupported'
    )
  })

  test('tells whether the runner offers frame generation without patching it', async () => {
    const stock = buildDll(STOCK_EXPORTS)
    writeFileSync(gdi32, stock)
    expect(await runnerOffersFrameGeneration(dllDir)).toBe(false)
    expect(readFileSync(gdi32)).toEqual(stock)
    expect(existsSync(join(dllDir, 'gdi32.dll.heroic-stock'))).toBe(false)

    await enableFrameGenerationInRunner(dllDir)
    expect(await runnerOffersFrameGeneration(dllDir)).toBe(true)

    writeFileSync(
      gdi32,
      buildDll({
        ...STOCK_EXPORTS,
        D3DKMTEnumAdapters2: 0x1020,
        D3DKMTQueryAdapterInfo: 0x1030
      })
    )
    expect(await runnerOffersFrameGeneration(dllDir)).toBe(true)

    writeFileSync(
      gdi32,
      buildDll({ ...STOCK_EXPORTS, D3DKMTQueryAdapterInfo: 0x1030 })
    )
    expect(await runnerOffersFrameGeneration(dllDir)).toBe(false)
    expect(await runnerOffersFrameGeneration(join(dllDir, 'missing'))).toBe(
      false
    )
  })
})
