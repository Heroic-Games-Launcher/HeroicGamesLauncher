import { join } from 'path'
import { userInfo } from 'os'
import { spawn } from 'child_process'
import { callRunner } from 'backend/launcher'
import {
  getAureliaBin,
  getFileSize,
  formatTime,
  sendProgressUpdate
} from 'backend/utils'
import { appFolder } from 'backend/constants/paths'
import { logError, LogPrefix } from 'backend/logger'
import type { CallRunnerOptions, ExecResult, Status } from 'common/types'
import type {
  AureliaConfigShowResponse,
  AureliaInfoResponse,
  AureliaLibrariesResponse,
  AureliaProgressEvent
} from './aurelia_types'
import type { SteamInstallLibrary } from 'common/types/steam'

export class AureliaError extends Error {
  readonly aborted: boolean
  constructor(message: string, aborted = false) {
    super(message)
    this.name = 'AureliaError'
    this.aborted = aborted
  }
}

/**
 * Runs an `aurelia` command and returns the raw {@link ExecResult}.
 * Keeps Aurelia's session/config/cache under Heroic's own config folder
 */
const aureliaConfigDir = join(appFolder, 'aurelia')

/**
 * Isolated daemon endpoint for Heroic's aurelia commands.
 */
const aureliaDaemonSocket =
  process.platform === 'win32'
    ? `\\\\.\\pipe\\aurelia-heroic-${userInfo().username}`
    : join(aureliaConfigDir, 'daemon.sock')

let daemonEnsured = false

/**
 * Start Aurelia's session daemon
 */
function ensureAureliaDaemon(): void {
  if (daemonEnsured) return
  daemonEnsured = true
  const { dir, bin } = getAureliaBin()
  try {
    const child = spawn(dir ? join(dir, bin) : bin, ['daemon'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: {
        ...process.env,
        AURELIA_CONFIG_DIR: aureliaConfigDir,
        AURELIA_DAEMON_SOCKET: aureliaDaemonSocket
      }
    })
    child.on('error', (error) =>
      logError(
        ['Unable to start the Aurelia daemon', String(error)],
        LogPrefix.Steam
      )
    )
    child.unref()
  } catch (error) {
    logError(
      ['Unable to start the Aurelia daemon', String(error)],
      LogPrefix.Steam
    )
  }
}

export async function runAureliaCommand(
  commandParts: string[],
  options: CallRunnerOptions = {}
): Promise<ExecResult> {
  ensureAureliaDaemon()
  const { dir, bin } = getAureliaBin()
  return callRunner(
    commandParts,
    { name: 'steam', logPrefix: LogPrefix.Steam, bin, dir },
    {
      ...options,
      env: {
        AURELIA_CONFIG_DIR: aureliaConfigDir,
        AURELIA_DAEMON_SOCKET: aureliaDaemonSocket,
        AURELIA_NO_SPAWN: '1',
        ...options.env
      }
    }
  )
}

/**
 * Runs an `aurelia` command with `--json` and returns its parsed result.
 */
export async function runAurelia<T = unknown>(
  commandParts: string[],
  options: CallRunnerOptions = {}
): Promise<T> {
  const res = await runAureliaCommand([...commandParts, '--json'], options)
  return parseAureliaJson<T>(res)
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-9;]*[A-Za-z]/g

/** Strips ANSI escape sequences (Aurelia's tracing logger colourises output). */
function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

/**
 * Extracts every top-level JSON value (object/array) found in `text`, in order.
 */
function extractJsonValues(text: string): unknown[] {
  const values: unknown[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === '{' || ch === '[') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}' || ch === ']') {
      if (depth > 0) {
        depth--
        if (depth === 0 && start !== -1) {
          try {
            values.push(JSON.parse(text.slice(start, i + 1)))
          } catch {
            // Not valid JSON
          }
          start = -1
        }
      }
    }
  }

  return values
}

/** The last non-empty line of `text`, used to surface plain-text errors. */
function lastNonEmptyLine(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return lines[lines.length - 1] ?? ''
}

export function parseAureliaJson<T>(res: ExecResult): T {
  if (res.abort) {
    throw new AureliaError('aurelia command was aborted', true)
  }

  // fall back to scanning stderr
  const stdout = stripAnsi(res.stdout)
  const stderr = stripAnsi(res.stderr)
  const stdoutValues = extractJsonValues(stdout)
  const values = stdoutValues.length ? stdoutValues : extractJsonValues(stderr)
  const parsed = values.at(-1)

  if (parsed === undefined) {
    const raw =
      res.error || lastNonEmptyLine(stderr) || lastNonEmptyLine(stdout)
    throw new AureliaError(raw || 'aurelia produced no JSON output')
  }
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'error' in parsed &&
    parsed.error
  ) {
    throw new AureliaError(String(parsed.error))
  }
  return parsed as T
}

/**
 * Builds an `onOutput` handler that forwards Aurelia's NDJSON `progress` events
 * {@link sendProgressUpdate}. Shared by install, update, verify and move
 */
export function makeAureliaProgressHandler(
  appName: string,
  status: Status
): (data: string) => void {
  return (data: string) => {
    for (const rawLine of stripAnsi(data).split('\n')) {
      const line = rawLine.trim()
      if (!line.startsWith('{')) continue

      let evt: AureliaProgressEvent
      try {
        evt = JSON.parse(line)
      } catch {
        continue
      }
      if (evt.event !== 'progress') continue

      // Match the MiB/s unit the other runners report.
      const downSpeed =
        typeof evt.speed_bps === 'number'
          ? evt.speed_bps / 1024 ** 2
          : undefined
      const eta =
        typeof evt.eta_seconds === 'number'
          ? formatTime(Math.floor(evt.eta_seconds))
          : '--:--:--'

      sendProgressUpdate({
        appName,
        runner: 'steam',
        status,
        progress: {
          bytes: getFileSize(evt.bytes_downloaded ?? 0),
          eta,
          percent:
            typeof evt.percent === 'number'
              ? Math.round(evt.percent * 100) / 100
              : undefined,
          downSpeed,
          diskSpeed: downSpeed,
          file: evt.file
        }
      })
    }
  }
}

export function makeAureliaQrHandler(
  onUrl: (url: string) => void,
  onScanned?: () => void
): (data: string) => void {
  return (data: string) => {
    for (const rawLine of stripAnsi(data).split('\n')) {
      const line = rawLine.trim()
      if (!line.startsWith('{')) continue

      let evt: { event?: string; url?: string }
      try {
        evt = JSON.parse(line)
      } catch {
        continue
      }
      if (evt.event === 'qr_challenge' && typeof evt.url === 'string') {
        onUrl(evt.url)
      } else if (evt.event === 'qr_scanned') {
        onScanned?.()
      }
    }
  }
}

/** One NDJSON status line emitted by `aurelia login --json` while it runs. */
interface AureliaLoginEvent {
  event?: string
  /** For `guard_required`: `email` | `device` | `device_confirmation`. */
  type?: string
  message?: string
}

/**
 * Builds an `onOutput` handler
 */
export function makeAureliaLoginHandler(
  onEvent: (event: AureliaLoginEvent) => void
): (data: string) => void {
  return (data: string) => {
    for (const rawLine of stripAnsi(data).split('\n')) {
      const line = rawLine.trim()
      if (!line.startsWith('{')) continue

      let evt: AureliaLoginEvent
      try {
        evt = JSON.parse(line)
      } catch {
        continue
      }
      if (typeof evt.event === 'string') {
        onEvent(evt)
      }
    }
  }
}

/**
 * Fetches Steam store details for one or more app ids via `aurelia info`.
 */
export async function fetchAureliaInfo(
  appIds: string[],
  options: { extended?: boolean; language?: string } = {}
): Promise<AureliaInfoResponse[]> {
  if (!appIds.length) {
    return []
  }
  const result = await runAurelia<AureliaInfoResponse | AureliaInfoResponse[]>([
    'info',
    ...appIds,
    ...(options.extended ? ['--extended'] : []),
    ...(options.language ? ['-l', options.language] : [])
  ])
  return Array.isArray(result) ? result : [result]
}

export async function getSteamLibraryPath(): Promise<string | undefined> {
  try {
    const config = await runAurelia<AureliaConfigShowResponse>([
      'config',
      'show'
    ])
    return config.steam_library_path || undefined
  } catch (error) {
    logError(
      ['Unable to read Aurelia config for Steam library path', error],
      LogPrefix.Steam
    )
    return undefined
  }
}

/**
 * Lists the Steam library folders
 */
export async function getSteamInstallLibraries(): Promise<
  SteamInstallLibrary[]
> {
  try {
    const result = await runAurelia<AureliaLibrariesResponse>(['libraries'])
    return result.libraries ?? []
  } catch (error) {
    logError(['Unable to list Steam install libraries', error], LogPrefix.Steam)
    return []
  }
}
