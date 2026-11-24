import { REQS_OTHER_TITLE } from 'common/utils'
import type { InstallPlatform, Reqs } from 'common/types'

/**
 * Pure helpers that shape Steam's store metadata into Heroic's `ExtraInfo`.
 * Kept apart from the game manager: no IO, no Aurelia, no state.
 */

// Maps Aurelia's store platform strings
export function toInstallPlatforms(platforms?: string[]): InstallPlatform[] {
  if (!platforms) return []
  const mapped = platforms
    .map((p): InstallPlatform | undefined => {
      const lc = p.toLowerCase()
      if (lc.startsWith('win')) return 'Windows'
      if (lc.startsWith('mac') || lc === 'osx') return 'Mac'
      if (lc.startsWith('lin') || lc.startsWith('steam')) return 'linux'
      return undefined
    })
    .filter((p): p is InstallPlatform => p !== undefined)
  return Array.from(new Set(mapped))
}

/**
 * Strips Steam's store-description markup
 */
export function stripSteamMarkup(input?: string): string {
  if (!input) return ''
  return input
    .replace(/\[\/?p[^\]]*\]/gi, '\n')
    .replace(/\[\/?[a-z][^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * `label -> value` pair
 */
function splitRequirement(line: string): [string, string] {
  const idx = line.indexOf(':')
  if (idx === -1) return [REQS_OTHER_TITLE, line.trim()]
  return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
}

/**
 * Builds `Reqs[]` table
 */
export function buildReqs(
  minimum: string[] = [],
  recommended: string[] = []
): Reqs[] {
  const min = new Map<string, string>()
  const rec = new Map<string, string>()

  const collect = (lines: string[], target: Map<string, string>) => {
    for (const line of lines) {
      if (!line.trim()) continue
      const [label, value] = splitRequirement(line)
      target.set(
        label,
        target.has(label) ? `${target.get(label)}\n${value}` : value
      )
    }
  }
  collect(minimum, min)
  collect(recommended, rec)

  const labels: string[] = []
  for (const label of min.keys()) {
    if (label !== REQS_OTHER_TITLE) labels.push(label)
  }
  for (const label of rec.keys()) {
    if (label !== REQS_OTHER_TITLE && !labels.includes(label))
      labels.push(label)
  }

  const reqs: Reqs[] = labels.map((title) => ({
    title,
    minimum: min.get(title) ?? '',
    recommended: rec.get(title) ?? ''
  }))

  const other = [min.get(REQS_OTHER_TITLE), rec.get(REQS_OTHER_TITLE)]
    .filter(Boolean)
    .join('\n')
  if (other) {
    reqs.push({ title: REQS_OTHER_TITLE, minimum: other, recommended: '' })
  }

  return reqs
}
