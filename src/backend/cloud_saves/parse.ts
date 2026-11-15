import type {
  CloudSyncCounts,
  CloudSyncReason,
  CloudSyncState
} from 'common/types'

export interface ParsedSyncOutput {
  state: CloudSyncState
  action?: 'upload' | 'download' | 'none'
  reason?: CloudSyncReason
  timestamp?: string
  computedPath?: string
  remoteDate?: string
  localDate?: string
  counts?: CloudSyncCounts
}

const GOGDL_CONFLICT = /Files in conflict|Refused to (?:upload|download) files/i
const GOGDL_ERROR =
  /There was an error uploading a file|Downloading file failed|Failed to commit|\[SAVES\] ERROR:|Traceback \(most recent call last\)/i

const countMatches = (text: string, regex: RegExp): number | undefined => {
  const matches = regex.exec(text)
  return matches ? Number(matches[1]) : undefined
}

const countOccurrences = (text: string, regex: RegExp): number =>
  text.match(regex)?.length ?? 0

const lastTimestamp = (stdout: string): string | undefined => {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const last = lines.at(-1)
  return last && /^\d+(?:\.\d+)?$/.test(last) ? last : undefined
}

const gogdlAction = (
  stderr: string
): ParsedSyncOutput['action'] | undefined => {
  if (/Uploading files|No files in cloud, uploading/i.test(stderr))
    return 'upload'
  if (/Downloading files|No files locally, downloading/i.test(stderr))
    return 'download'
  if (/Nothing to do/i.test(stderr)) return 'none'
  return undefined
}

export const parseGogdlOutput = (
  stdout: string,
  stderr: string
): ParsedSyncOutput => {
  const action = gogdlAction(stderr)
  const parsed: ParsedSyncOutput = {
    state: 'unknown',
    action,
    counts: {
      local: countMatches(stderr, /Local files: (\d+)/),
      cloud: countMatches(stderr, /Files in cloud: (\d+)/),
      deletedLocal: countOccurrences(stderr, /DELETING LOCALLY/g),
      deletedCloud: countOccurrences(stderr, /DELETING IN CLOUD/g)
    }
  }

  if (GOGDL_CONFLICT.test(stderr)) {
    parsed.state = 'conflicts'
    parsed.reason = 'conflict'
  } else if (GOGDL_ERROR.test(stderr)) {
    parsed.state = 'failed'
    parsed.reason = 'provider-error'
  } else if (action) {
    parsed.state = 'ok'
  }

  // gogdl writes a timestamp to stdout even when nothing was synced, so it can
  // only be persisted when the run completed without conflicts or errors.
  if (parsed.state !== 'conflicts' && parsed.state !== 'failed') {
    parsed.timestamp = lastTimestamp(stdout)
  }

  return parsed
}

const LEGENDARY_ERROR = /Login failed!|Game not installed:/i

export const parseLegendaryOutput = (
  stdout: string,
  stderr: string
): ParsedSyncOutput => {
  const output = `${stdout}\n${stderr}`
  const parsed: ParsedSyncOutput = { state: 'unknown' }

  parsed.computedPath = /Computed save path: "(.+)"/.exec(output)?.[1]

  const remoteDate = /- Cloud save date: (.+)/.exec(output)?.[1]?.trim()
  if (remoteDate && remoteDate !== 'N/A') parsed.remoteDate = remoteDate
  const localDate = /- Local save date: (.+)/.exec(output)?.[1]?.trim()
  if (localDate && localDate !== 'N/A') parsed.localDate = localDate

  if (/Path contains unprocessed variables/i.test(output)) {
    parsed.state = 'failed'
    parsed.reason = 'unresolved-vars'
  } else if (/Unable to lock install data/i.test(output)) {
    parsed.state = 'failed'
    parsed.reason = 'lock'
  } else if (/skipping due to --yes/i.test(output)) {
    parsed.state = 'failed'
    parsed.reason = 'no-path'
  } else if (LEGENDARY_ERROR.test(output)) {
    parsed.state = 'failed'
    parsed.reason = 'provider-error'
  } else if (/No files to upload/i.test(output)) {
    parsed.state = 'incomplete'
  } else if (
    /Save game (?:downloading|uploading) is disabled, skipping/i.test(output)
  ) {
    parsed.state = 'ok'
    parsed.action = 'none'
  } else if (/Uploading local savegame/i.test(output)) {
    parsed.state = 'ok'
    parsed.action = 'upload'
  } else if (/Downloading remote savegame/i.test(output)) {
    parsed.state = 'ok'
    parsed.action = 'download'
  } else if (
    /is up to date, skipping|No cloud or local savegame found/i.test(output)
  ) {
    parsed.state = 'ok'
    parsed.action = 'none'
  }

  return parsed
}
