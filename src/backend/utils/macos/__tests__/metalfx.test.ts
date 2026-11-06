import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installMetalFXIntoPrefix, removeMetalFXFromPrefix } from '../metalfx'

describe('MetalFX NGX setup', () => {
  let root: string
  let dllDir: string
  let system32: string
  let prefix: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-metalfx-'))
    dllDir = join(root, 'lib/wine/x86_64-windows')
    prefix = join(root, 'prefix')
    system32 = join(prefix, 'drive_c/windows/system32')
    mkdirSync(dllDir, { recursive: true })
    mkdirSync(system32, { recursive: true })
    writeFileSync(join(dllDir, 'nvngx.dll'), 'stock ngx')
    writeFileSync(join(dllDir, 'nvngx-on-metalfx.dll'), 'metalfx ngx')
    writeFileSync(join(dllDir, 'nvapi64.dll'), 'nvapi')
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  test('copies the MetalFX NGX into the prefix and leaves the runner alone', async () => {
    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual({
      available: true,
      copied: ['nvngx.dll', 'nvapi64.dll']
    })
    expect(readFileSync(join(system32, 'nvngx.dll'), 'utf-8')).toBe(
      'metalfx ngx'
    )
    expect(readFileSync(join(dllDir, 'nvngx.dll'), 'utf-8')).toBe('stock ngx')
    expect(existsSync(join(dllDir, 'nvngx.dll.heroic-stock'))).toBe(false)

    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual({
      available: true,
      copied: []
    })
  })

  test('reports runners without a MetalFX NGX and does not copy', async () => {
    rmSync(join(dllDir, 'nvngx-on-metalfx.dll'))
    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual({
      available: false,
      copied: []
    })
    expect(existsSync(join(system32, 'nvngx.dll'))).toBe(false)
    expect(existsSync(join(prefix, '.heroic-metalfx.json'))).toBe(false)
  })

  test('keeps the original prefix DLL and recopies when the runner copy changes', async () => {
    writeFileSync(join(system32, 'nvapi64.dll'), 'old nvapi')

    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual({
      available: true,
      copied: ['nvngx.dll', 'nvapi64.dll']
    })
    expect(readFileSync(join(system32, 'nvapi64.dll'), 'utf-8')).toBe('nvapi')

    const updated = join(dllDir, 'nvapi64.dll')
    writeFileSync(updated, 'new nvapi')
    const later = new Date(statSync(updated).mtimeMs + 5000)
    utimesSync(updated, later, later)

    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual({
      available: true,
      copied: ['nvapi64.dll']
    })
    expect(readFileSync(join(system32, 'nvapi64.dll'), 'utf-8')).toBe(
      'new nvapi'
    )
    expect(
      readFileSync(join(system32, 'nvapi64.dll.heroic-backup'), 'utf-8')
    ).toBe('old nvapi')

    expect((await removeMetalFXFromPrefix(prefix)).sort()).toEqual([
      'nvapi64.dll',
      'nvngx.dll'
    ])
    expect(readFileSync(join(system32, 'nvapi64.dll'), 'utf-8')).toBe(
      'old nvapi'
    )
    expect(existsSync(join(system32, 'nvngx.dll'))).toBe(false)
    expect(existsSync(join(prefix, '.heroic-metalfx.json'))).toBe(false)
    expect(await removeMetalFXFromPrefix(prefix)).toEqual([])
  })

  test('restores a prefix from a manifest that only stored backup or none', async () => {
    writeFileSync(join(system32, 'nvngx.dll'), 'metalfx ngx')
    writeFileSync(join(system32, 'nvngx.dll.heroic-backup'), 'previous ngx')
    writeFileSync(join(system32, 'nvapi64.dll'), 'nvapi')
    writeFileSync(
      join(prefix, '.heroic-metalfx.json'),
      JSON.stringify({ 'nvngx.dll': 'backup', 'nvapi64.dll': 'none' })
    )

    expect((await removeMetalFXFromPrefix(prefix)).sort()).toEqual([
      'nvapi64.dll',
      'nvngx.dll'
    ])
    expect(readFileSync(join(system32, 'nvngx.dll'), 'utf-8')).toBe(
      'previous ngx'
    )
    expect(existsSync(join(system32, 'nvapi64.dll'))).toBe(false)
  })
})
