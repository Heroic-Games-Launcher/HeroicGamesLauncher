import { open } from 'node:fs/promises'
import { join } from 'path'
import { GlobalConfig } from 'backend/config'

/**
 * Real-time Steam download tracking.
 *
 * Steam's `appmanifest_<id>.acf` byte counters (`BytesDownloaded` etc.) are only
 * flushed to disk at depot boundaries, so they stay frozen for minutes while a
 * download is actively running and are useless for live progress. The files in
 * `steamapps/downloading/<id>` are preallocated to their full size up front, so
 * their on-disk size doesn't reflect progress either.
 *
 * The only file Steam updates in real time is `logs/content_log.txt`. It logs,
 * per app, the total bytes to download (`update started : download 0/<total>`)
 * and, globally, the live transfer rate (`Current download rate: <X> Mbps`)
 * roughly once a minute. This module parses that log to derive the download
 * speed and an estimated percentage (by integrating the logged rate over time).
 *
 * Caveat: the logged rate is global, so if Steam downloads several apps at once
 * the estimate is shared between them. Heroic drives installs one at a time, so
 * in practice this tracks the single active download. The estimate is also only
 * an estimate; the install loop still uses the appmanifest as the source of
 * truth for when a download is actually finished.
 */

// Steam rotates `content_log.txt` to `content_log.previous.txt` at ~4MB, so the
// live file is always smaller than this and reading this much of its tail
// effectively reads the whole current log - guaranteeing the session's "update
// started" anchor line is present (unless it rotated out during a very long
// download, in which case the caller falls back to the appmanifest estimate).
const CONTENT_LOG_TAIL_BYTES = 4 * 1024 * 1024

// Steam logs the download rate roughly once a minute. When estimating progress
// we extrapolate from the latest rate sample to "now", but cap that window so a
// paused/stalled download (no new samples) doesn't make the estimate run away.
const MAX_RATE_EXTRAPOLATION_SECONDS = 120

// ts-prune-ignore-next
export interface SteamDownloadProgress {
  // 0-100, or undefined if it can't be determined yet.
  percent?: number
  // Estimated downloaded/total bytes (network, compressed).
  downloadedBytes: number
  totalBytes: number
  // Current download speed in bytes/second, or undefined if unknown.
  bytesPerSecond?: number
}

function getContentLogPath(): string {
  const { defaultSteamPath } = GlobalConfig.get().getSettings()
  const steamRoot = defaultSteamPath.replaceAll("'", '')
  return join(steamRoot, 'logs', 'content_log.txt')
}

/** Reads the last {@link CONTENT_LOG_TAIL_BYTES} bytes of `content_log.txt`. */
async function readContentLogTail(): Promise<string> {
  let handle
  try {
    handle = await open(getContentLogPath(), 'r')
    const { size } = await handle.stat()
    const start = Math.max(0, size - CONTENT_LOG_TAIL_BYTES)
    const length = size - start
    if (length <= 0) return ''
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, start)
    return buffer.toString('utf-8')
  } catch {
    // Missing/unreadable log -> caller falls back to the appmanifest.
    return ''
  } finally {
    await handle?.close()
  }
}

/** Parses the `[YYYY-MM-DD HH:MM:SS]` prefix into a local-time epoch (ms). */
function parseLogTimestamp(line: string): number | undefined {
  const match = line.match(
    /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\]/
  )
  if (!match) return undefined
  const [, year, month, day, hour, minute, second] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ).getTime()
}

/**
 * Parses `content_log.txt` and returns the live download progress for the given
 * Steam app id, or `undefined` if the log has no usable info for it (e.g. no
 * download in progress, or a pure local "reuse" update with no network bytes).
 */
export async function getSteamDownloadProgress(
  appId: string
): Promise<SteamDownloadProgress | undefined> {
  const text = await readContentLogTail()
  if (!text) return undefined

  const lines = text.split(/\r?\n/)

  // Anchor on the most recent "update started" line for this app; everything
  // before it belongs to a previous session and is irrelevant.
  const startedRe = new RegExp(
    `AppID ${appId} update started : download (\\d+)/(\\d+)`
  )
  let startIdx = -1
  let alreadyDownloaded = 0
  let totalBytes = 0
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(startedRe)
    if (match) {
      startIdx = i
      alreadyDownloaded = Number(match[1])
      totalBytes = Number(match[2])
      break
    }
  }

  if (startIdx === -1 || !Number.isFinite(totalBytes) || totalBytes <= 0) {
    return undefined
  }

  const sessionStart = parseLogTimestamp(lines[startIdx])
  if (sessionStart === undefined) return undefined

  // Collect the global "Current download rate" samples logged after the session
  // started, in order.
  const rateRe = /Current download rate: ([\d.]+) Mbps/
  const samples: { time: number; bytesPerSecond: number }[] = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const match = lines[i].match(rateRe)
    if (!match) continue
    const time = parseLogTimestamp(lines[i])
    if (time === undefined) continue
    // Mbps (megabits/s) -> bytes/s.
    const bytesPerSecond = (Number(match[1]) * 1_000_000) / 8
    if (Number.isFinite(bytesPerSecond)) {
      samples.push({ time, bytesPerSecond })
    }
  }

  // Integrate the rate samples over time to estimate how much has downloaded.
  // Each rate sample is taken as the average rate over the interval leading up
  // to it; the final sample is extended to "now".
  let downloadedBytes = alreadyDownloaded
  let previousTime = sessionStart
  for (const sample of samples) {
    const seconds = (sample.time - previousTime) / 1000
    if (seconds > 0) downloadedBytes += sample.bytesPerSecond * seconds
    previousTime = sample.time
  }

  const latestRate = samples.at(-1)?.bytesPerSecond
  if (latestRate !== undefined) {
    // Extrapolate from the last rate sample up to now, but only for a bounded
    // window: Steam logs the rate ~once a minute, so if much more time than that
    // has elapsed without a new sample the download has likely stalled or been
    // paused - keep extrapolating in that case and the estimate would run away.
    const trailingSeconds = Math.min(
      (Date.now() - previousTime) / 1000,
      MAX_RATE_EXTRAPOLATION_SECONDS
    )
    if (trailingSeconds > 0) downloadedBytes += latestRate * trailingSeconds
  }

  downloadedBytes = Math.min(downloadedBytes, totalBytes)
  const percent = Math.min(100, (downloadedBytes / totalBytes) * 100)

  return {
    percent,
    downloadedBytes,
    totalBytes,
    bytesPerSecond: latestRate
  }
}

/**
 * The live state of a Steam app's download, derived from `content_log.txt`.
 * - `downloading`: Steam is actively fetching/staging the app.
 * - `queued`: the update is queued but hasn't started downloading yet.
 * - `paused`: the download is paused/suspended in Steam.
 * - `stopped`: the app was uninstalled/cancelled (no longer being installed).
 * - `done`: the app finished downloading and is fully installed.
 * - `unknown`: the log has nothing about this app (yet).
 */
export type SteamDownloadState =
  | 'downloading'
  | 'queued'
  | 'paused'
  | 'stopped'
  | 'done'
  | 'unknown'

/**
 * Reads the latest known download state for the given Steam app id from
 * `content_log.txt`. Steam logs a `AppID <id> state changed : <flags>` line on
 * every transition (queued, started, paused, finished, uninstalled), which lets
 * Heroic tell whether a download actually started, is paused, was stopped, or
 * completed - none of which the (depot-boundary-only) appmanifest reveals in
 * real time.
 */
export async function getSteamDownloadState(
  appId: string
): Promise<SteamDownloadState> {
  const text = await readContentLogTail()
  if (!text) return 'unknown'

  const lines = text.split(/\r?\n/)
  const stateRe = new RegExp(`AppID ${appId} state changed : (.+)`)

  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(stateRe)
    if (!match) continue

    const flags = match[1]
    // Order matters: an in-progress update can carry several flags at once
    // (e.g. "Fully Installed,Update Queued,Update Running,"), so check the most
    // specific/active states first.
    if (flags.includes('Uninstalled')) return 'stopped'
    if (flags.includes('Update Paused') || flags.includes('(Suspended)')) {
      return 'paused'
    }
    if (flags.includes('Update Running') || flags.includes('Update Started')) {
      return 'downloading'
    }
    if (flags.includes('Update Queued')) return 'queued'
    if (flags.includes('Fully Installed')) return 'done'
    // Any other terminal flag set (e.g. just "Update Required,") means Steam
    // isn't currently working on it.
    return 'stopped'
  }

  return 'unknown'
}
