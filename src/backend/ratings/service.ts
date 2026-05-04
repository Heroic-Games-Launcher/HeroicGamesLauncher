import { GlobalConfig } from 'backend/config'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import CacheStore from 'backend/cache'
import type { RatingEntry, GameInfo, RatingKey, Runner } from 'common/types'
import { libraryStore as legendaryLibraryStore } from 'backend/storeManagers/legendary/electronStores'
import { libraryStore as gogLibraryStore } from 'backend/storeManagers/gog/electronStores'
import { libraryStore as nileLibraryStore } from 'backend/storeManagers/nile/electronStores'
import { libraryStore as zoomLibraryStore } from 'backend/storeManagers/zoom/electronStores'
import { libraryStore as sideloadLibraryStore } from 'backend/storeManagers/sideload/electronStores'
import { decryptApiKey, encryptApiKey, isEncryptedValue } from './secureKey'
import { fetchRawgRatings } from './provider_rawg'
import Store from 'electron-store'

const FRESH_HOURS_BY_STATUS: Record<RatingEntry['status'], number> = {
  ok: 24 * 7,
  not_found: 24 * 3,
  error: 6
}

const ratingsStore = new CacheStore<RatingEntry>(
  'external_ratings_rawg_metacritic_score',
  null
)
const legacyRatingsConfigStore = new Store<{ rawgApiKey?: string }>({
  cwd: 'ratings_store',
  clearInvalidConfig: true
})
const pendingRatingsSync = new Map<string, RatingKey>()
let ratingsWorkerRunning = false

function gameKey({ runner, appName }: Pick<RatingKey, 'runner' | 'appName'>) {
  return `${runner}:${appName}`
}

function getProviderApiKey(): string {
  let stored = GlobalConfig.get().getSettings().rawgApiKey || ''
  if (!stored) {
    stored = legacyRatingsConfigStore.get('rawgApiKey', '')
    if (!stored) return ''

    const legacyDecrypted = decryptApiKey(stored)
    if (!legacyDecrypted) return ''

    const migrated = encryptApiKey(legacyDecrypted)
    void GlobalConfig.get().setSetting('rawgApiKey', migrated)
    return legacyDecrypted
  }

  if (!isEncryptedValue(stored)) {
    const reEncrypted = encryptApiKey(stored)
    if (isEncryptedValue(reEncrypted)) {
      void GlobalConfig.get().setSetting('rawgApiKey', reEncrypted)
    }
    return stored
  }

  return decryptApiKey(stored)
}

function writeEntry(
  game: RatingKey,
  entry: Omit<RatingEntry, 'staleAt'>
): RatingEntry {
  const saved: RatingEntry = {
    ...entry,
    staleAt: new Date(
      Date.now() + FRESH_HOURS_BY_STATUS[entry.status] * 60 * 60 * 1000
    ).toISOString()
  }
  ratingsStore.set(gameKey(game), saved)
  return saved
}

function getCachedRating(game: RatingKey): RatingEntry | null {
  return ratingsStore.get(gameKey(game)) || null
}

function isFreshRating(
  entry: RatingEntry | null,
  now: number = Date.now()
): boolean {
  if (!entry) return false
  const staleTime = new Date(entry.staleAt).getTime()
  return Number.isFinite(staleTime) && now < staleTime
}

async function ensureRating(game: RatingKey): Promise<RatingEntry | null> {
  if ((GlobalConfig.get().getSettings().ratingProvider || 'none') === 'none') {
    return null
  }

  const apiKey = getProviderApiKey()
  if (!apiKey) return null

  const cached = getCachedRating(game)
  if (isFreshRating(cached)) return cached

  try {
    logInfo(['[Ratings] RAWG fetch:', game.title], LogPrefix.Backend)
    const ratings = await fetchRawgRatings(apiKey, game.title)
    if (!ratings) {
      logInfo(
        ['[Ratings] No RAWG Metacritic match:', game.title],
        LogPrefix.Backend
      )
      return writeEntry(game, { status: 'not_found' })
    }

    logInfo(
      ['[Ratings] RAWG match:', game.title, `(score ${ratings.score})`],
      LogPrefix.Backend
    )
    return writeEntry(game, {
      status: 'ok',
      score: ratings.score,
      url: ratings.url
    })
  } catch (error) {
    logError(
      ['Failed to fetch ratings for game:', game.title, game.runner, error],
      LogPrefix.Backend
    )
    return writeEntry(game, { status: 'error' })
  }
}

function toRatingsGame(game: GameInfo): RatingKey {
  return {
    appName: game.app_name,
    runner: game.runner,
    title: game.title
  }
}

function getGamesForRunner(runner: Runner): GameInfo[] {
  if (runner === 'legendary') return legendaryLibraryStore.get('library', [])
  if (runner === 'gog') return gogLibraryStore.get('games', [])
  if (runner === 'nile') return nileLibraryStore.get('library', [])
  if (runner === 'zoom') return zoomLibraryStore.get('games', [])
  return sideloadLibraryStore.get('games', [])
}

function getLibraryGames(library?: Runner | 'all'): RatingKey[] {
  if (library && library !== 'all') {
    return getGamesForRunner(library).map(toRatingsGame)
  }

  return [
    ...getGamesForRunner('legendary').map(toRatingsGame),
    ...getGamesForRunner('gog').map(toRatingsGame),
    ...getGamesForRunner('nile').map(toRatingsGame),
    ...getGamesForRunner('zoom').map(toRatingsGame),
    ...getGamesForRunner('sideload').map(toRatingsGame)
  ]
}

function enqueueRatingsSync(games: RatingKey[]) {
  if ((GlobalConfig.get().getSettings().ratingProvider || 'none') === 'none') {
    return
  }

  if (!getProviderApiKey()) return

  const now = Date.now()
  const sizeBefore = pendingRatingsSync.size
  for (const game of games) {
    if (isFreshRating(getCachedRating(game), now)) continue
    pendingRatingsSync.set(gameKey(game), game)
  }
  const sizeAfter = pendingRatingsSync.size
  const newlyQueued = sizeAfter - sizeBefore
  if (newlyQueued > 0) {
    logInfo(
      ['[Ratings] Queued games:', `${newlyQueued}`, `(pending: ${sizeAfter})`],
      LogPrefix.Backend
    )
  }
  if (!ratingsWorkerRunning) {
    ratingsWorkerRunning = true
    void (async () => {
      try {
        logInfo(
          ['[Ratings] Worker started', `(pending: ${pendingRatingsSync.size})`],
          LogPrefix.Backend
        )
        let processed = 0
        while (pendingRatingsSync.size > 0) {
          const next = pendingRatingsSync.entries().next()
          if (next.done) break

          const [pendingKey, pendingGame] = next.value
          pendingRatingsSync.delete(pendingKey)
          await ensureRating(pendingGame)
          processed += 1
        }
        logInfo(
          ['[Ratings] Worker finished', `(processed: ${processed})`],
          LogPrefix.Backend
        )
      } finally {
        ratingsWorkerRunning = false
      }
    })()
  }
}

export function setApiKey(apiKey: string) {
  const trimmed = apiKey.trim()
  if (trimmed === getProviderApiKey().trim()) return

  const stored = trimmed ? encryptApiKey(trimmed) : ''
  void GlobalConfig.get().setSetting('rawgApiKey', stored)

  if (trimmed) enqueueRatingsSync(getLibraryGames('all'))
}

export function refreshLibraryRatings(target?: RatingKey[] | Runner | 'all') {
  if (Array.isArray(target)) {
    enqueueRatingsSync(target.length ? target : getLibraryGames('all'))
    return
  }
  enqueueRatingsSync(getLibraryGames(target))
}

export function getLibraryRatings(games: RatingKey[]) {
  if ((GlobalConfig.get().getSettings().ratingProvider || 'none') === 'none') {
    return Object.fromEntries(
      games.map((game) => [gameKey(game), null])
    ) as Record<string, RatingEntry | null>
  }

  return Object.fromEntries(
    games.map((game) => [
      gameKey(game),
      ratingsStore.get(gameKey(game)) || null
    ])
  ) as Record<string, RatingEntry | null>
}

export const getGameRatings = ensureRating
