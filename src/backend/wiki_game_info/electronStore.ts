import CacheStore from '../cache'
import type { WikiInfo } from 'common/types'

export const wikiGameInfoStore = new CacheStore<WikiInfo>(
  'wikigameinfo',
  60 * 24 * 30
)

export const umuStore = new CacheStore<string | null>('umu', 60 * 6, {
  invalidateCheck: (data) => !data
})
