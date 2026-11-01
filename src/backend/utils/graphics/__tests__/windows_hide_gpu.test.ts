import { execFile } from 'child_process'
import {
  getWindowsDisplayDevices,
  hideGpuDuringLaunch
} from '../windows_hide_gpu'

import type LogWriter from 'backend/logger/log_writer'

jest.mock('child_process')
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))
jest.mock('backend/constants/environment', () => ({ isWindows: true }))
jest.mock('backend/constants/paths', () => ({
  hideGpuScriptPath: "C:\\Users\\O'Brien\\Heroic\\hide_gpu_during_launch.ps1"
}))

const headlessGpu = {
  FriendlyName: 'NVIDIA GeForce RTX 5060 Ti',
  InstanceId:
    'PCI\\VEN_10DE&DEV_2D04&SUBSYS_41921458&REV_A1\\B6461E4D462DB04800',
  ConfigManagerErrorCode: 0
}
const mainGpu = {
  FriendlyName: 'NVIDIA GeForce RTX 5070',
  InstanceId:
    'PCI\\VEN_10DE&DEV_2F04&SUBSYS_205A10DE&REV_A1\\EE267519862DB04800',
  ConfigManagerErrorCode: 0
}

const logWarning = jest.fn()
const logWriter = {
  logInfo: jest.fn(),
  logWarning,
  writeString: jest.fn()
} as unknown as LogWriter

type ExecFileCallback = (
  error: Error | null,
  result?: { stdout: string; stderr: string }
) => void

// Mocks every PowerShell call: `onCommand` gets the decoded command and returns
// its stdout, or throws to make the call fail
function mockPowerShell(onCommand: (command: string) => string) {
  const commands: string[] = []
  jest.mocked(execFile).mockImplementation(((
    file: string,
    args: string[],
    options: object,
    callback: ExecFileCallback
  ) => {
    const command = Buffer.from(args[args.length - 1], 'base64').toString(
      'utf16le'
    )
    commands.push(command)
    try {
      callback(null, { stdout: onCommand(command), stderr: '' })
    } catch (error) {
      callback(error as Error)
    }
  }) as unknown as typeof execFile)
  return commands
}

describe('getWindowsDisplayDevices', () => {
  test('parses multiple GPUs and detects disabled ones', async () => {
    mockPowerShell(() =>
      JSON.stringify([{ ...headlessGpu, ConfigManagerErrorCode: 22 }, mainGpu])
    )

    expect(await getWindowsDisplayDevices()).toEqual([
      {
        name: headlessGpu.FriendlyName,
        instanceId: headlessGpu.InstanceId,
        disabled: true
      },
      {
        name: mainGpu.FriendlyName,
        instanceId: mainGpu.InstanceId,
        disabled: false
      }
    ])
  })

  test('parses a single GPU', async () => {
    mockPowerShell(() => JSON.stringify(mainGpu))

    expect(await getWindowsDisplayDevices()).toEqual([
      {
        name: mainGpu.FriendlyName,
        instanceId: mainGpu.InstanceId,
        disabled: false
      }
    ])
  })

  test('returns nothing if there are no GPUs or PowerShell fails', async () => {
    mockPowerShell(() => '')
    expect(await getWindowsDisplayDevices()).toEqual([])

    mockPowerShell(() => {
      throw new Error('powershell.exe not found')
    })
    expect(await getWindowsDisplayDevices()).toEqual([])
  })
})

describe('hideGpuDuringLaunch', () => {
  test("doesn't do anything if the GPU isn't there", async () => {
    const commands = mockPowerShell(() => JSON.stringify(mainGpu))

    const restore = await hideGpuDuringLaunch(
      headlessGpu.InstanceId,
      'C:\\Games\\Fortnite',
      logWriter
    )

    expect(restore).toBeUndefined()
    expect(commands).toHaveLength(1)
  })

  test("doesn't touch a GPU the user disabled themselves", async () => {
    const commands = mockPowerShell(() =>
      JSON.stringify([{ ...headlessGpu, ConfigManagerErrorCode: 22 }, mainGpu])
    )

    const restore = await hideGpuDuringLaunch(
      headlessGpu.InstanceId,
      'C:\\Games\\Fortnite',
      logWriter
    )

    expect(restore).toBeUndefined()
    expect(commands).toHaveLength(1)
  })

  test('launches the game anyway if the UAC prompt is declined', async () => {
    const commands = mockPowerShell((command) => {
      if (command.includes('Start-Process')) {
        throw new Error('The operation was canceled by the user.')
      }
      return JSON.stringify([headlessGpu, mainGpu])
    })

    const restore = await hideGpuDuringLaunch(
      headlessGpu.InstanceId,
      'C:\\Games\\Fortnite',
      logWriter
    )

    // The elevated script gets the right path, with the quote in it escaped
    expect(commands[1]).toContain(
      `-File "C:\\Users\\O''Brien\\Heroic\\hide_gpu_during_launch.ps1"`
    )
    expect(commands[1]).toContain('-Verb RunAs')
    expect(logWarning).toHaveBeenCalledWith(
      "Couldn't hide NVIDIA GeForce RTX 5060 Ti, launching the game anyway",
      expect.anything()
    )

    // The GPU never got disabled, so there's nothing to enable again
    await restore!()
    expect(commands).toHaveLength(3)
    expect(commands.some((command) => command.includes('pnputil'))).toBe(false)
  })
})
