const ACRONYMS = new Set([
  'RPG',
  'JRPG',
  'ARPG',
  'CRPG',
  'MMO',
  'MMORPG',
  'FPS',
  'TPS',
  'RTS',
  'MOBA',
  'VR',
  '2D',
  '3D'
])

function formatEpicTag(tag: string): string {
  const words = tag
    .trim()
    .split(/[_\s]+/)
    .filter(Boolean)

  return words
    .map((word, index) => {
      const upper = word.toUpperCase()
      if (ACRONYMS.has(upper)) {
        return upper
      }
      const lower = word.toLowerCase()
      return index === 0
        ? lower.charAt(0).toUpperCase() + lower.slice(1)
        : lower
    })
    .join(' ')
}

export function formatEpicTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return []
  }

  const formatted = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(formatEpicTag)
    .filter(Boolean)

  return [...new Set(formatted)]
}
