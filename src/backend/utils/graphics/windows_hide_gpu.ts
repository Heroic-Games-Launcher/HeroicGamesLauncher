import { execFile } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { z } from 'zod'

import { isWindows } from 'backend/constants/environment'
import { hideGpuScriptPath } from 'backend/constants/paths'
import { logError, logWarning, LogPrefix } from 'backend/logger'

import type { WindowsDisplayDevice } from 'common/types'
import type LogWriter from 'backend/logger/log_writer'

const execFileAsync = promisify(execFile)

// ConfigManagerErrorCode of a disabled device
const CODE_DISABLED = 22
// How long the user has to accept the UAC prompt before we launch the game anyway
const UAC_TIMEOUT_MS = 60_000
// How long the script gets to re-enable the GPU once the game has exited
const RESTORE_TIMEOUT_MS = 10_000
// Re-enable the GPU after this long even if the game wasn't detected
const WATCH_TIMEOUT_SEC = 600

const PnpDevice = z.object({
  FriendlyName: z.string(),
  InstanceId: z.string(),
  ConfigManagerErrorCode: z.number()
})

async function runPowerShell(command: string): Promise<string> {
  // -EncodedCommand avoids any quoting issues with the command line. Progress
  // output has to be turned off, as it would end up in stdout with it
  const encodedCommand = Buffer.from(
    `$ProgressPreference = 'SilentlyContinue'; ${command}`,
    'utf16le'
  ).toString('base64')
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand],
    { windowsHide: true }
  )
  return stdout
}

// Single-quoted PowerShell string. PowerShell treats curly quotes as single quotes too
const powerShellString = (str: string) =>
  `'${str.replace(/['\u2018\u2019\u201a\u201b]/g, '$&$&')}'`

/**
 * Starts a program as administrator, which shows a UAC prompt unless Heroic
 * itself is elevated. Does not wait for the program to exit
 * @returns false if the program couldn't be started (e.g. the UAC prompt was declined)
 */
async function runElevated(program: string, args: string): Promise<boolean> {
  try {
    await runPowerShell(
      `Start-Process -FilePath ${powerShellString(program)} -ArgumentList ${powerShellString(args)} -Verb RunAs -WindowStyle Hidden -ErrorAction Stop`
    )
    return true
  } catch (error) {
    logWarning(
      [`Failed to run ${program} as administrator:`, error],
      LogPrefix.Backend
    )
    return false
  }
}

/**
 * Lists the PCI display adapters (GPUs) Windows knows about, including
 * disabled ones
 */
async function getWindowsDisplayDevices(): Promise<WindowsDisplayDevice[]> {
  if (!isWindows) return []

  try {
    const stdout = await runPowerShell(
      "Get-PnpDevice -Class Display -PresentOnly | Where-Object InstanceId -like 'PCI\\*' | Select-Object FriendlyName,InstanceId,ConfigManagerErrorCode | ConvertTo-Json -Compress"
    )
    if (!stdout.trim()) return []

    // This is a single object if there's one GPU, or an array if there are multiple
    const parsed = PnpDevice.or(PnpDevice.array()).parse(JSON.parse(stdout))
    return (Array.isArray(parsed) ? parsed : [parsed]).map((device) => ({
      name: device.FriendlyName,
      instanceId: device.InstanceId,
      disabled: device.ConfigManagerErrorCode === CODE_DISABLED
    }))
  } catch (error) {
    logError(['Failed to list display devices:', error], LogPrefix.Backend)
    return []
  }
}

const readStatus = async (statusFile: string) =>
  (await readFile(statusFile, 'utf-8').catch(() => '')).trim()

async function waitForStatus(
  statusFile: string,
  wantedStatuses: string[],
  timeoutMs: number
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let status = await readStatus(statusFile)
  while (!wantedStatuses.includes(status) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    status = await readStatus(statusFile)
  }
  return status
}

/**
 * Disables a GPU until the game has picked which GPU to use, for games that
 * ignore the GPU preference set in Windows / the GPU driver.
 * The actual work happens in `hide_gpu_during_launch.ps1`, which has to run
 * elevated.
 * @param instanceId PnP instance ID of the GPU to hide
 * @param gameDir The game's install folder, used to recognize the game's processes
 * @returns A function to call once the game has exited, or undefined if the GPU wasn't touched
 */
async function hideGpuDuringLaunch(
  instanceId: string,
  gameDir: string,
  logWriter: LogWriter
): Promise<(() => Promise<void>) | undefined> {
  const device = (await getWindowsDisplayDevices()).find(
    (device) => device.instanceId === instanceId
  )
  if (!device) {
    await logWriter.logWarning(
      `The GPU to hide (${instanceId}) wasn't found, launching without hiding it`,
      LogPrefix.Backend
    )
    return
  }
  if (device.disabled) {
    await logWriter.logInfo(
      `${device.name} is already disabled, not hiding it`,
      LogPrefix.Backend
    )
    return
  }

  await logWriter.logInfo(
    `Hiding ${device.name} while the game starts`,
    LogPrefix.Backend
  )

  const tempDir = await mkdtemp(join(tmpdir(), 'heroic-hide-gpu-'))
  const statusFile = join(tempDir, 'status')
  const stopFile = join(tempDir, 'stop')
  const logFile = join(tempDir, 'log')

  const params = Buffer.from(
    JSON.stringify({
      instanceId,
      gameDir,
      statusFile,
      stopFile,
      logFile,
      deadline: Date.now() + UAC_TIMEOUT_MS,
      timeoutSec: WATCH_TIMEOUT_SEC
    })
  ).toString('base64')

  const started = await runElevated(
    'powershell.exe',
    `-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${hideGpuScriptPath}" -Params ${params}`
  )
  const status = started
    ? await waitForStatus(statusFile, ['disabled', 'error'], UAC_TIMEOUT_MS)
    : ''
  if (status !== 'disabled') {
    await logWriter.logWarning(
      `Couldn't hide ${device.name}, launching the game anyway`,
      LogPrefix.Backend
    )
  }

  return async () => {
    // The script re-enables the GPU as soon as it sees this file
    await writeFile(stopFile, '')
    if ((await readStatus(statusFile)) === 'disabled') {
      await waitForStatus(statusFile, ['enabled'], RESTORE_TIMEOUT_MS)
    }

    // Windows PowerShell writes UTF-8 files with a BOM
    const scriptLog = (
      await readFile(logFile, 'utf-8').catch(() => '')
    ).replace(/^\uFEFF/, '')
    if (scriptLog) {
      await logWriter.writeString(`Hide GPU log:\n${scriptLog}`)
    }

    // Safety net in case the script didn't get to re-enable the GPU
    const current = (await getWindowsDisplayDevices()).find(
      (device) => device.instanceId === instanceId
    )
    if (current?.disabled) {
      await logWriter.logWarning(
        `${device.name} is still disabled, enabling it again`,
        LogPrefix.Backend
      )
      await runElevated('pnputil.exe', `/enable-device "${instanceId}"`)
    }

    await rm(tempDir, { recursive: true, force: true })
  }
}

export { getWindowsDisplayDevices, hideGpuDuringLaunch }
