import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'graceful-fs'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { GameSettings } from 'common/types'
import type LogWriter from 'backend/logger/log_writer'
import { runWineCommand } from '../../../launcher'
import {
  applyPendingEAAppUpdate,
  parseEAAppRegistry,
  pickStagedFolder,
  prefixPathFromWindowsPath
} from '../eaAppUpdate'

jest.mock('backend/logger')
jest.mock('backend/constants/environment', () => ({ isWindows: false }))
jest.mock('../../../launcher', () => ({ runWineCommand: jest.fn() }))

const LIVE = '13.805.2.6319-1791454115'
const STAGED = '13.805.11.6320-1791874834'

const eaSection = (key: string, isUnavailable: 0 | 1, liveFolder = LIVE) =>
  `[${key}] 1791874864
#time=1dd5ae15eba0792
"ClientPath"="C:\\\\Program Files\\\\Electronic Arts\\\\EA Desktop\\\\EA Desktop\\\\EADesktop.exe"
"EaConnectLink2EAAppPath"="C:\\\\Program Files\\\\Electronic Arts\\\\EA Desktop\\\\${liveFolder}\\\\EA Desktop\\\\Link2EA.exe"
"InstallLocation"="C:\\\\Program Files\\\\Electronic Arts\\\\EA Desktop\\\\"
"InstallSuccessful"="true"
"IsUnavailable"=dword:0000000${isUnavailable}
`

const systemReg = (isUnavailable: 0 | 1, liveFolder = LIVE) =>
  [
    'WINE REGISTRY Version 2',
    '',
    '[Software\\\\Classes\\\\.exe] 1786516032',
    '@="exefile"',
    '',
    eaSection(
      'Software\\\\Electronic Arts\\\\EA Desktop',
      isUnavailable,
      liveFolder
    ),
    '[Software\\\\Electronic Arts\\\\EADM] 1786516032',
    '"IsUnavailable"=dword:00000001',
    '',
    eaSection(
      'Software\\\\Wow6432Node\\\\Electronic Arts\\\\EA Desktop',
      isUnavailable,
      liveFolder
    )
  ].join('\n')

describe('parseEAAppRegistry', () => {
  test('reads the flag, install location and active version', () => {
    expect(parseEAAppRegistry(systemReg(1))).toEqual({
      isUnavailable: true,
      installLocation: 'C:\\Program Files\\Electronic Arts\\EA Desktop\\',
      liveFolder: LIVE
    })
  })

  test('ignores IsUnavailable in other EA keys', () => {
    expect(parseEAAppRegistry(systemReg(0)).isUnavailable).toBe(false)
  })

  test('handles a prefix without the EA app', () => {
    expect(parseEAAppRegistry('WINE REGISTRY Version 2\n')).toEqual({
      isUnavailable: false
    })
  })
})

describe('prefixPathFromWindowsPath', () => {
  test('maps C: into drive_c', () => {
    expect(
      prefixPathFromWindowsPath(
        '/prefix',
        'C:\\Program Files\\Electronic Arts\\EA Desktop\\'
      )
    ).toBe('/prefix/drive_c/Program Files/Electronic Arts/EA Desktop')
  })

  test('rejects other drives', () => {
    expect(prefixPathFromWindowsPath('/prefix', 'D:\\Games')).toBeUndefined()
  })
})

describe('pickStagedFolder', () => {
  const folders = ['13.796.0.6309-1790527992', STAGED, LIVE, 'EA Desktop', 'VC']

  test('picks the newest version, comparing numerically', () => {
    expect(pickStagedFolder(folders, LIVE)).toBe(STAGED)
  })

  test('returns nothing when the newest version is already active', () => {
    expect(pickStagedFolder(folders, STAGED)).toBeUndefined()
  })

  test('picks the newest version when the active one is unknown', () => {
    expect(pickStagedFolder(folders)).toBe(STAGED)
  })
})

describe('applyPendingEAAppUpdate', () => {
  let prefix: string
  let eaFolder: string
  let machineIni: string
  const logWriter = {
    logInfo: jest.fn(),
    logWarning: jest.fn()
  } as unknown as LogWriter
  const settings = (): GameSettings =>
    ({
      winePrefix: prefix,
      wineVersion: { type: 'wine', bin: '/usr/bin/wine', name: 'Wine' }
    }) as GameSettings

  beforeEach(() => {
    prefix = mkdtempSync(join(tmpdir(), 'heroic-ea-'))
    eaFolder = join(
      prefix,
      'drive_c',
      'Program Files',
      'Electronic Arts',
      'EA Desktop'
    )
    for (const folder of [LIVE, STAGED]) {
      mkdirSync(join(eaFolder, folder, 'Destager'), { recursive: true })
      writeFileSync(join(eaFolder, folder, 'Destager', 'EADestager.exe'), '')
    }
    const programData = join(prefix, 'drive_c', 'ProgramData', 'EA Desktop')
    mkdirSync(programData, { recursive: true })
    machineIni = join(programData, 'machine.ini')
    jest.mocked(runWineCommand).mockReset()
  })

  afterEach(() => rmSync(prefix, { recursive: true, force: true }))

  test('does nothing when no update is pending', async () => {
    writeFileSync(join(prefix, 'system.reg'), systemReg(0))
    writeFileSync(machineIni, 'machine.updatepending=0\n')

    await applyPendingEAAppUpdate(settings(), logWriter)

    expect(runWineCommand).not.toHaveBeenCalled()
  })

  test('runs the newest staged destager', async () => {
    writeFileSync(join(prefix, 'system.reg'), systemReg(1))
    writeFileSync(
      machineIni,
      'machine.updatebucket=83\nmachine.updatepending=1\n'
    )
    // Like the real destager: switch versions and clear the flag
    jest.mocked(runWineCommand).mockImplementation(() => {
      writeFileSync(join(prefix, 'system.reg'), systemReg(0, STAGED))
      return Promise.resolve({ stdout: '', stderr: '' })
    })

    await applyPendingEAAppUpdate(settings(), logWriter)

    expect(runWineCommand).toHaveBeenCalledTimes(1)
    expect(jest.mocked(runWineCommand).mock.calls[0][0].commandParts).toEqual([
      `C:\\Program Files\\Electronic Arts\\EA Desktop\\${STAGED}\\Destager\\EADestager.exe`,
      '--launchHelperArgument=true'
    ])
    expect(readFileSync(machineIni, 'utf-8')).toBe(
      'machine.updatebucket=83\nmachine.updatepending=0\n'
    )
  })

  test('clears a leftover flag when the destager does not', async () => {
    writeFileSync(join(prefix, 'system.reg'), systemReg(1))
    writeFileSync(machineIni, 'machine.updatepending=1\n')
    jest.mocked(runWineCommand).mockResolvedValue({ stdout: '', stderr: '' })

    await applyPendingEAAppUpdate(settings(), logWriter)

    const regCommands = jest
      .mocked(runWineCommand)
      .mock.calls.map(([args]) => args.commandParts)
      .filter((parts) => parts[0] === 'reg')
    expect(regCommands.map((parts) => parts[2])).toEqual([
      'HKLM\\Software\\Electronic Arts\\EA Desktop',
      'HKLM\\Software\\Wow6432Node\\Electronic Arts\\EA Desktop'
    ])
    // The update was not applied, so it must stay pending
    expect(readFileSync(machineIni, 'utf-8')).toBe('machine.updatepending=1\n')
  })

  test('only clears the flag when the newest version is already active', async () => {
    writeFileSync(join(prefix, 'system.reg'), systemReg(1, STAGED))
    writeFileSync(machineIni, 'machine.updatepending=1\n')
    jest.mocked(runWineCommand).mockResolvedValue({ stdout: '', stderr: '' })

    await applyPendingEAAppUpdate(settings(), logWriter)

    const commands = jest
      .mocked(runWineCommand)
      .mock.calls.map(([args]) => args.commandParts[0])
    expect(commands).toEqual(['reg', 'reg'])
    expect(readFileSync(machineIni, 'utf-8')).toBe('machine.updatepending=0\n')
  })

  test('skips CrossOver bottles', async () => {
    writeFileSync(join(prefix, 'system.reg'), systemReg(1))
    await applyPendingEAAppUpdate(
      {
        ...settings(),
        wineVersion: { type: 'crossover', bin: '', name: 'CrossOver' }
      } as GameSettings,
      logWriter
    )
    expect(runWineCommand).not.toHaveBeenCalled()
  })
})
