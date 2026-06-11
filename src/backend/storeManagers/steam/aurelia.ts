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

/**
 * Thin wrapper around the bundled `aurelia` CLI. Every Steam store operation is
 * delegated to Aurelia (a standalone command-line Steam client) instead of
 * reading Steam's own files or driving the Steam client through `steam://`
 * URLs. Commands are run through Heroic's shared {@link callRunner} so they
 * share the runner log writers and the abort handling used by the other runners.
 */
export class AureliaError extends Error {
  readonly aborted: boolean
  constructor(message: string, aborted = false) {
    super(message)
    this.name = 'AureliaError'
    this.aborted = aborted
  }
}

// Flags whose following value is a secret and must be redacted from logs.
const SENSITIVE_FLAGS = new Set(['-p', '--password', '--guard'])

function redactCommand(parts: string[]): string {
  const out = [...parts]
  for (let i = 0; i < out.length - 1; i++) {
    if (SENSITIVE_FLAGS.has(out[i])) out[i + 1] = '<redacted>'
  }
  return `aurelia ${out.join(' ')}`
}

/**
 * Runs an `aurelia` command and returns the raw {@link ExecResult}. Callers that
 * want the parsed JSON should use {@link runAurelia} instead; this is for the
 * streaming commands (install/update/verify/move) that also need an `onOutput`.
 *
 * Unlike the other runners, Aurelia is spawned directly rather than through the
 * shared `callRunner`: on Windows that helper wraps commands in PowerShell's
 * `Start-Process`, which does not pipe the child's stdout back to us, so the
 * `--json` output (and the streaming `onOutput`) would be lost. Aurelia exits on
 * its own (even `play` blocks until the game closes), so we don't need the
 * "wait for detached children" behaviour `Start-Process` provides.
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
        // Surface a non-zero exit; the JSON `{ error }` body (if any) is still
        // parsed by callers via parseAureliaJson.
        result.error = stderr.trim() || `aurelia exited with code ${code}`
      }
      resolve(result)
    })
  })
}

/**
 * Runs an `aurelia` command with `--json` and returns its parsed result.
 *
 * Aurelia prints one JSON value per line; the streaming commands emit a series
 * of `{event:"progress"}` lines followed by a final result object, so the
 * result is always the last JSON line. An `{ "error": ... }` line (Aurelia's
 * error shape) is surfaced as an {@link AureliaError}.
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
 *
 * Aurelia formats its output inconsistently: simple commands (login, account,
 * list, info, ...) pretty-print a single multi-line JSON value, while the
 * streaming commands emit a sequence of compact one-line `progress` events
 * followed by a result. A line-by-line parse can't read the pretty-printed form
 * (no single line is valid JSON), so we walk the text tracking brace/bracket
 * depth - respecting string literals - and parse each balanced top-level value.
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
            // Not valid JSON (e.g. unbalanced log noise); skip it.
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

  // The result is the last top-level JSON value. Aurelia normally writes it to
  // stdout, but errors (and some `--json` output) can land on stderr, so fall
  // back to scanning stderr before giving up. ANSI colour codes from Aurelia's
  // tracing logger are stripped first so they don't confuse the extractor.
  const stdout = stripAnsi(res.stdout)
  const stderr = stripAnsi(res.stderr)
  const stdoutValues = extractJsonValues(stdout)
  const values = stdoutValues.length ? stdoutValues : extractJsonValues(stderr)
  const parsed = values[values.length - 1]

  if (parsed === undefined) {
    // Aurelia sometimes prints failures as plain text (e.g. a Steam
    // "TwoFactorCodeMismatch") rather than a JSON `{ error }`. Surface that
    // text so the real reason reaches the logs and UI.
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

/** One `{event:"progress"}` line emitted by install/update/verify/move. */
interface AureliaProgressEvent {
  event?: string
  state?: string
  bytes_downloaded?: number
  total_bytes?: number
  percent?: number
  speed_bps?: number
  eta_seconds?: number | null
  file?: string
}

/**
 * Builds an `onOutput` handler that forwards Aurelia's NDJSON `progress` events
 * to Heroic's download manager via {@link sendProgressUpdate}. Shared by
 * install, update, verify and move (Aurelia emits the same event shape for all
 * four), replacing the old `appmanifest`-polling progress estimation.
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
          // Aurelia's staging is effectively the disk write, so reuse the rate.
          diskSpeed: downSpeed,
          file: evt.file
        }
      })
    }
  }
}

/**
 * Builds an `onOutput` handler that watches Aurelia's `login --qr` stream for the
 * `qr_challenge` event and forwards its URL to `onUrl`. The URL encodes a Steam
 * login token; rendering it as a QR code lets the user approve the sign-in from
 * the Steam Mobile app instead of typing a username/password. Aurelia keeps
 * running (blocked on the scan) and emits the account result once approved.
 */
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

// ---------------------------------------------------------------------------
// JSON shapes returned by the Aurelia CLI (only the fields Heroic consumes).
// ---------------------------------------------------------------------------

export interface AureliaLibraryGame {
  app_id: number
  name: string
  playtime_forever_minutes?: number
  is_installed: boolean
  install_path?: string | null
  update_available?: boolean
  update_queued?: boolean
  active_branch?: string
  is_owned?: boolean
  is_family_shared?: boolean
  online_required?: boolean | null
}

interface AureliaDlcEntry {
  app_id: number
  name?: string | null
  owned?: boolean | null
  installed?: boolean | null
  disabled?: boolean | null
}

export interface AureliaDlcResponse {
  app_id: number
  dlc: AureliaDlcEntry[]
}

interface AureliaInfoResponse {
  app_id: number
  name?: string
  type?: string
  is_free?: boolean
  // Short store blurb; `full_description` is the long one (with Steam `[p]`
  // markup). Genres/tags/metacritic/requirements/website live under `extended`.
  description?: string
  full_description?: string
  developers?: string[]
  publishers?: string[]
  release_date?: string | null
  coming_soon?: boolean
  price?: string | null
  platforms?: string[]
  reviews?: string
  assets?: {
    background?: string
    capsule?: string
    header?: string
    hero?: string
    logo?: string
  }
  extended?: {
    categories?: string[]
    genres?: string[]
    tags?: string[]
    metacritic?: number | null
    website?: string | null
    requirements?: {
      minimum?: string[]
      recommended?: string[]
    }
  }
}

/**
 * Fetches Steam store details for one or more app ids via `aurelia info`.
 *
 * Aurelia resolves several ids over a single Steam logon (one batched
 * StoreBrowse call), so `info <id1> <id2> <id3>` costs one connection: a single
 * id yields one JSON object, several yield a JSON array in the requested order.
 * This normalises both shapes to an array (preserving order) so callers can
 * batch lookups without special-casing the count.
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

export interface AureliaDryRunResponse {
  app_id: number
  platform?: string
  download_size: number
  disk_size: number
  depot_count?: number
}

interface AureliaLaunchOption {
  // Aurelia prints the launch-option index as a string ("0", "1", ...).
  id: string | number
  description?: string
  executable?: string
  arguments?: string
  working_dir?: string
  oslist?: string
  osarch?: string
  type?: string
}

export interface AureliaLaunchOptionsResponse {
  app_id: number
  launch_options: AureliaLaunchOption[]
}

export interface AureliaAccount {
  // Aurelia prints the 64-bit SteamID as a JSON number; it exceeds JS's safe
  // integer range, so callers should coerce it to a string rather than rely on
  // the (precision-lossy) numeric value.
  steam_id: string | number
  account_name: string
  country?: string
  email?: string
  email_validated?: boolean
}
