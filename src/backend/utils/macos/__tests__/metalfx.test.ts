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
  enableMetalFXInRunner,
  installMetalFXIntoPrefix,
  removeMetalFXFromPrefix
} from '../metalfx'

describe('MetalFX NGX setup', () => {
  let root: string
  let dllDir: string
  let system32: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-metalfx-'))
    dllDir = join(root, 'lib/wine/x86_64-windows')
    system32 = join(root, 'prefix/drive_c/windows/system32')
    mkdirSync(dllDir, { recursive: true })
    mkdirSync(system32, { recursive: true })
    writeFileSync(join(dllDir, 'nvngx.dll'), 'stock ngx')
    writeFileSync(join(dllDir, 'nvngx-on-metalfx.dll'), 'metalfx ngx')
    writeFileSync(join(dllDir, 'nvapi64.dll'), 'nvapi')
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  test('swaps the MetalFX NGX into the runner once, keeping the stock one', async () => {
    expect(await enableMetalFXInRunner(dllDir)).toBe(true)
    expect(readFileSync(join(dllDir, 'nvngx.dll'), 'utf-8')).toBe('metalfx ngx')
    expect(readFileSync(join(dllDir, 'nvngx.dll.heroic-stock'), 'utf-8')).toBe(
      'stock ngx'
    )

    expect(await enableMetalFXInRunner(dllDir)).toBe(true)
    expect(readFileSync(join(dllDir, 'nvngx.dll.heroic-stock'), 'utf-8')).toBe(
      'stock ngx'
    )
  })

  test('reports runners without a MetalFX NGX', async () => {
    rmSync(join(dllDir, 'nvngx-on-metalfx.dll'))
    expect(await enableMetalFXInRunner(dllDir)).toBe(false)
    expect(readFileSync(join(dllDir, 'nvngx.dll'), 'utf-8')).toBe('stock ngx')
  })

  test('installs into the prefix and restores what was there before', async () => {
    const prefix = join(root, 'prefix')
    writeFileSync(join(system32, 'nvapi64.dll'), 'old nvapi')

    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual([
      'nvngx.dll',
      'nvapi64.dll'
    ])
    expect(readFileSync(join(system32, 'nvapi64.dll'), 'utf-8')).toBe('nvapi')
    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual([])

    // A runner update changes the DLL; the original backup must survive
    writeFileSync(join(dllDir, 'nvapi64.dll'), 'new nvapi')
    expect(await installMetalFXIntoPrefix(prefix, dllDir)).toEqual([
      'nvapi64.dll'
    ])

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
})
