import axios from 'axios'
import { app } from 'electron'

const RAWG_API_URL = 'https://api.rawg.io/api/games'
const MAX_NORMALIZED_LEVENSHTEIN_DISTANCE = 0.5
const NON_MEANINGFUL_TOKENS = new Set(['a', 'an', 'and', 'for', 'of', 'the'])

interface RawgGameResult {
  slug: string
  name: string
  metacritic: number | null
}

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getMeaningfulTokens(normalizedTitle: string): Set<string> {
  return new Set(
    normalizedTitle
      .split(' ')
      .filter((token) => token.length >= 3 && !NON_MEANINGFUL_TOKENS.has(token))
  )
}

function hasValidMetacritic(
  candidate: RawgGameResult
): candidate is RawgGameResult & { metacritic: number } {
  return typeof candidate.metacritic === 'number' && candidate.metacritic > 0
}

export async function fetchRawgRatings(
  apiKey: string,
  title: string
): Promise<{ score: number; url: string } | null> {
  const response = await axios.get<{ results: RawgGameResult[] }>(
    RAWG_API_URL,
    {
      params: {
        search: title,
        key: apiKey
      },
      headers: {
        'User-Agent': `HeroicGamesLauncher/${app.getVersion()}`
      }
    }
  )

  const normalizedQuery = normalizeTitle(title)
  if (!normalizedQuery) return null
  const queryTokens = getMeaningfulTokens(normalizedQuery)

  const candidates = (response.data.results || []).filter(hasValidMetacritic)

  let bestMatch: (RawgGameResult & { metacritic: number }) | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const normalizedName = normalizeTitle(candidate.name)
    if (!normalizedName) continue
    if (queryTokens.size) {
      const nameTokens = getMeaningfulTokens(normalizedName)
      if (
        nameTokens.size &&
        !Array.from(queryTokens).some((token) => nameTokens.has(token))
      ) {
        continue
      }
    }

    const maxLength = Math.max(normalizedQuery.length, normalizedName.length)

    let distance = 0
    if (maxLength) {
      if (normalizedQuery === normalizedName) {
        distance = 0
      } else {
        const previousRow = Array.from(
          { length: normalizedName.length + 1 },
          (_, index) => index
        )
        const currentRow = Array.from(
          { length: normalizedName.length + 1 },
          () => 0
        )

        for (let i = 0; i < normalizedQuery.length; i++) {
          currentRow[0] = i + 1

          for (let j = 0; j < normalizedName.length; j++) {
            const substitutionCost =
              normalizedQuery[i] === normalizedName[j] ? 0 : 1
            currentRow[j + 1] = Math.min(
              currentRow[j] + 1,
              previousRow[j + 1] + 1,
              previousRow[j] + substitutionCost
            )
          }

          for (let j = 0; j <= normalizedName.length; j++) {
            previousRow[j] = currentRow[j]
          }
        }

        distance = previousRow[normalizedName.length] / maxLength
      }
    }

    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = candidate
    }
  }

  if (!bestMatch) return null
  if (bestDistance > MAX_NORMALIZED_LEVENSHTEIN_DISTANCE) return null

  return {
    score: bestMatch.metacritic,
    url: `https://rawg.io/games/${bestMatch.slug}`
  }
}
