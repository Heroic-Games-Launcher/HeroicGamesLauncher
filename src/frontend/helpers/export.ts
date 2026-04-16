import { GameInfo } from 'common/types'

/**
 * Recursively flatten a nested object to a flat key->value map.
 * - Arrays are joined as comma-separated strings; empty arrays are skipped.
 * - Empty objects are skipped.
 * - Nested keys use dot notation.
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value === null || value === undefined) {
      continue
    } else if (Array.isArray(value)) {
      if (value.length === 0) continue
      // Only include primitive arrays as comma-separated values
      const primitiveValues = value.filter(
        (v) => typeof v !== 'object' || v === null
      )
      if (primitiveValues.length > 0) {
        result[fullKey] = primitiveValues
          .map((v) => String(v).replace(/"/g, '""'))
          .join(', ')
      }
    } else if (typeof value === 'object') {
      const nested = flattenObject(value as Record<string, unknown>, fullKey)
      if (Object.keys(nested).length > 0) {
        Object.assign(result, nested)
      }
    } else {
      result[fullKey] = String(value).replace(/"/g, '""')
    }
  }
  return result
}

/**
 * Generate CSV content from a list of GameInfo objects.
 */
export function generateCsv(games: GameInfo[]): string {
  const allEntries = games.map((game) =>
    flattenObject(game as unknown as Record<string, unknown>)
  )

  if (allEntries.length === 0) {
    return ''
  }

  // Build union of all column headers
  const allColumns = Array.from(
    new Set(allEntries.flatMap((e) => Object.keys(e)))
  )

  // Build CSV
  const csvHeader = allColumns.map((c) => `"${c}"`).join(',')
  const csvRows = allEntries.map((entry) =>
    allColumns
      .map((col) => (entry[col] !== undefined ? `"${entry[col]}"` : ''))
      .join(',')
  )
  return [csvHeader, ...csvRows].join('\n')
}
