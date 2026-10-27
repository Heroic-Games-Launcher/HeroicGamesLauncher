type HistoryData = Record<string, unknown>

function isRecord(value: unknown): value is HistoryData {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isPlaytimeData(value: unknown): value is HistoryData {
  if (!isRecord(value)) return false
  return Object.values(value).every((entry) => isHistoryNode(entry))
}

function isHistoryNode(value: unknown): boolean {
  if (!isRecord(value)) return false
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'firstPlayed' || key === 'lastPlayed') {
      if (typeof entry !== 'string') return false
    } else if (key === 'totalPlayed') {
      if (typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0)
        return false
    } else if (isRecord(entry) && !isHistoryNode(entry)) {
      return false
    }
  }
  return true
}

export function countPlaytimeGames(data: HistoryData): number {
  return Object.values(data).reduce<number>((count, value) => {
    if (!isRecord(value)) return count
    if (
      'firstPlayed' in value ||
      'lastPlayed' in value ||
      'totalPlayed' in value
    )
      return count + 1
    return count + countPlaytimeGames(value)
  }, 0)
}

// Electron-store interprets dots in game IDs as nested keys. Merge those
// branches recursively so importing one game doesn't remove its siblings.
export function mergePlaytime(
  local: HistoryData,
  backup: HistoryData
): HistoryData {
  return Object.fromEntries(
    [...new Set([...Object.keys(local), ...Object.keys(backup)])].map((key) => {
      const current = Object.hasOwn(local, key) ? local[key] : undefined
      const incoming = backup[key]
      if (!Object.hasOwn(backup, key)) return [key, current]
      if (isRecord(current) && isRecord(incoming)) {
        return [key, mergePlaytime(current, incoming)]
      }
      return [key, incoming]
    })
  )
}
