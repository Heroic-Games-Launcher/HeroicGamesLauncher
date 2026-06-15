import { spawn } from 'child_process'
import { join } from 'path'
import {
  getAureliaBin,
  getFileSize,
  formatTime,
  sendProgressUpdate
} from 'backend/utils'
import {
  getRunnerLogWriter,
  logError,
  logInfo,
  LogPrefix
} from 'backend/logger'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import type { CallRunnerOptions, ExecResult, Status } from 'common/types'
import type {
  AureliaConfigShowResponse,
  AureliaInfoResponse,
  AureliaProgressEvent
} from './aurelia_types'

export class AureliaError extends Error {
  readonly aborted: boolean
  constructor(message: string, aborted = false) {
    super(message)
    this.name = 'AureliaError'
    this.aborted = aborted
  }
}

const SENSITIVE_FLAGS = new Set(['-p', '--password', '--guard'])

function redactCommand(parts: string[]): string {
  const out = [...parts]
  for (let i = 0; i < out.length - 1; i++) {
    if (SENSITIVE_FLAGS.has(out[i])) out[i + 1] = '<redacted>'
  }
  return `aurelia ${out.join(' ')}`
}

/**
 * Runs an `aurelia` command and returns the raw {@link ExecResult}.
 */
export async function runAureliaCommand(
  commandParts: string[],
  options: CallRunnerOptions = {}
): Promise<ExecResult> {
  const { dir, bin } = getAureliaBin()
  const fullPath = dir ? join(dir, bin) : bin
  const parts = commandParts.filter(Boolean)

  const logWriters = [
    ...(options.logWriters ?? []),
    getRunnerLogWriter('steam')
  ]
  const safeCommand = redactCommand(parts)
  const prefix = `${options.logMessagePrefix ?? 'Running command'}:`
  logInfo([prefix, safeCommand], LogPrefix.Steam)
  for (const writer of logWriters) {
    await writer.logInfo([prefix, safeCommand].join(' '))
  }

  const abortId = options.abortId || Math.random().toString()
  const abortController = createAbortController(abortId)

  return new Promise<ExecResult>((resolve) => {
    const child = spawn(fullPath, parts, {
      cwd: options.cwd || dir,
      env: { ...process.env, ...options.env },
      signal: abortController.signal
    })

    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf-8')
    child.stdout.on('data', (data: string) => {
      stdout += data
      logWriters.forEach((writer) => writer.writeString(data))
      options.onOutput?.(data, child)
    })

    child.stderr.setEncoding('utf-8')
    child.stderr.on('data', (data: string) => {
      stderr += data
      logWriters.forEach((writer) => writer.writeString(data))
      options.onOutput?.(data, child)
    })

    child.on('error', (error) => {
      deleteAbortController(abortId)
      if (abortController.signal.aborted) {
        resolve({ stdout, stderr, fullCommand: safeCommand, abort: true })
        return
      }
      logError(['Error running', `"${safeCommand}":`, error], LogPrefix.Steam)
      resolve({ stdout, stderr, fullCommand: safeCommand, error: `${error}` })
    })

    child.on('close', (code, signal) => {
      deleteAbortController(abortId)
      if (abortController.signal.aborted) {
        resolve({ stdout, stderr, fullCommand: safeCommand, abort: true })
        return
      }
      const result: ExecResult = { stdout, stderr, fullCommand: safeCommand }
      if (signal) {
        result.error = `Process terminated with signal ${signal}`
      } else if (code !== 0 && code !== null) {
        // non-zero exit
        result.error = stderr.trim() || `aurelia exited with code ${code}`
      }
      resolve(result)
    })
  })
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
  const parsed = values[values.length - 1]

  if (parsed === undefined) {
    const raw =
      res.error || lastNonEmptyLine(stderr) || lastNonEmptyLine(stdout)
    throw new AureliaError(raw || 'aurelia produced no JSON output')
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    'error' in parsed &&
    (parsed as { error: unknown }).error
  ) {
    throw new AureliaError(String((parsed as { error: unknown }).error))
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

      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      const evt = parsed as AureliaProgressEvent
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
  onUrl: (url: string) => void
): (data: string) => void {
  return (data: string) => {
    for (const rawLine of stripAnsi(data).split('\n')) {
      const line = rawLine.trim()
      if (!line.startsWith('{')) continue

      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      const evt = parsed as { event?: string; url?: string }
      if (evt.event === 'qr_challenge' && typeof evt.url === 'string') {
        onUrl(evt.url)
      }
    }
  }
}

/**
 * Fetches Steam store details for one or more app ids via `aurelia info`.
 */
export async function fetchAureliaInfo(
  appIds: string[],
  options: { extended?: boolean } = {}
): Promise<AureliaInfoResponse[]> {
  if (!appIds.length) {
    return []
  }
  const result = await runAurelia<AureliaInfoResponse | AureliaInfoResponse[]>([
    'info',
    ...appIds,
    ...(options.extended ? ['--extended'] : [])
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
