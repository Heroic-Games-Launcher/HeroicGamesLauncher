import { advancedSearchEntries } from './advanced'
import { generalSearchEntries } from './general'
import { runnersSearchEntries } from './runners'
import type {
  ResolvedSettingsSearchEntry,
  SettingsSearchEntry,
  SettingsSearchTab
} from './types'

export type { ResolvedSettingsSearchEntry, SettingsSearchTab }

const SETTINGS_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  ...generalSearchEntries,
  ...runnersSearchEntries,
  ...advancedSearchEntries
]

type Translate = (key: string) => string

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

export const resolveSettingsSearchEntries = (
  platform: NodeJS.Platform | 'unknown',
  t: Translate
): ResolvedSettingsSearchEntry[] =>
  SETTINGS_SEARCH_ENTRIES.filter(
    (entry) =>
      !entry.platforms ||
      (platform !== 'unknown' && entry.platforms.includes(platform))
  ).map((entry) => ({
    ...entry,
    title: t(entry.titleKey),
    section: t(entry.sectionKey)
  }))

export const searchSettings = (
  entries: ResolvedSettingsSearchEntry[],
  query: string
): ResolvedSettingsSearchEntry[] => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []

  const tokens = normalizedQuery.split(' ')
  const matches: Array<{
    entry: ResolvedSettingsSearchEntry
    score: number
  }> = []

  for (const entry of entries) {
    const title = normalize(entry.title)
    let score: number | null = null

    if (title === normalizedQuery) {
      score = 0
    } else if (title.startsWith(normalizedQuery)) {
      score = 1
    } else if (title.includes(normalizedQuery)) {
      score = 2
    } else if (tokens.every((token) => title.includes(token))) {
      score = 3
    }

    if (score !== null) {
      matches.push({ entry, score })
    }
  }

  return matches
    .sort(
      (a, b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title)
    )
    .slice(0, 12)
    .map(({ entry }) => entry)
}
