import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureRegistryStrings, readRegistryString } from '../registry'

const USER_REG = `WINE REGISTRY Version 2
;; All keys relative to \\\\User\\\\S-1-5-21-0-0-0-1000

#arch=win64

[Software\\\\Wine\\\\Mac Driver] 1760000000
#time=1dc3e1f0a1b2c3d
"RetinaMode"="y"
"Path"="C:\\\\Games\\\\\\"Quoted\\""

[Software\\\\Wine\\\\Mac Driver\\\\Sub] 1760000000
"RetinaMode"="n"
`

describe('readRegistryString', () => {
  test('reads a value from its key, ignoring case', () => {
    expect(
      readRegistryString(USER_REG, 'software\\wine\\mac driver', 'retinamode')
    ).toBe('y')
  })

  test('does not read values of sub keys', () => {
    expect(
      readRegistryString(
        USER_REG,
        'Software\\Wine\\Mac Driver\\Sub',
        'RetinaMode'
      )
    ).toBe('n')
  })

  test('unescapes backslashes and quotes', () => {
    expect(
      readRegistryString(USER_REG, 'Software\\Wine\\Mac Driver', 'Path')
    ).toBe('C:\\Games\\"Quoted"')
  })

  test('returns undefined for missing values', () => {
    expect(
      readRegistryString(USER_REG, 'Software\\Wine\\Mac Driver', 'Missing')
    ).toBeUndefined()
    expect(
      readRegistryString(USER_REG, 'Software\\Wine\\X11 Driver', 'RetinaMode')
    ).toBeUndefined()
  })
})

describe('ensureRegistryStrings', () => {
  let prefix: string

  beforeEach(() => {
    prefix = mkdtempSync(join(tmpdir(), 'heroic-registry-'))
    writeFileSync(join(prefix, 'user.reg'), USER_REG)
  })

  afterEach(() => rmSync(prefix, { recursive: true, force: true }))

  test('only runs reg for values that differ', async () => {
    const runReg = jest.fn().mockResolvedValue(undefined)
    const changed = await ensureRegistryStrings(
      prefix,
      [
        {
          hive: 'HKCU',
          key: 'Software\\Wine\\Mac Driver',
          name: 'RetinaMode',
          data: 'y'
        },
        {
          hive: 'HKLM',
          key: 'Software\\NVIDIA Corporation\\Global\\NGXCore',
          name: 'FullPath',
          data: 'C:\\Windows\\System32'
        }
      ],
      runReg
    )

    expect(runReg).toHaveBeenCalledTimes(1)
    expect(runReg).toHaveBeenCalledWith([
      'reg',
      'add',
      'HKLM\\Software\\NVIDIA Corporation\\Global\\NGXCore',
      '/v',
      'FullPath',
      '/t',
      'REG_SZ',
      '/d',
      'C:\\Windows\\System32',
      '/f'
    ])
    expect(changed.map(({ name }) => name)).toEqual(['FullPath'])
  })

  test('treats a missing value as its default', async () => {
    const runReg = jest.fn().mockResolvedValue(undefined)
    const value = {
      hive: 'HKCU' as const,
      key: 'Software\\Wine\\Mac Driver',
      name: 'CaptureDisplaysForFullscreen',
      data: 'n'
    }
    const defaults = {
      'Software\\Wine\\Mac Driver\\CaptureDisplaysForFullscreen': 'n'
    }

    expect(
      await ensureRegistryStrings(prefix, [value], runReg, defaults)
    ).toEqual([])
    expect(runReg).not.toHaveBeenCalled()

    await ensureRegistryStrings(
      prefix,
      [{ ...value, data: 'y' }],
      runReg,
      defaults
    )
    expect(runReg).toHaveBeenCalledTimes(1)
  })
})
