import CacheStore from 'backend/cache'
import { TypeCheckedStoreBackend } from 'backend/electron_store'
import { GameInfo } from 'common/types'
import { Subproduct } from './constants'
import { HumbleBundleInstallInfo } from 'common/types/humble_bundle'

const configStore = new TypeCheckedStoreBackend('humbleConfigStore', {
  cwd: 'humble_bundle_store'
})

const libraryStore = new CacheStore<GameInfo[], 'games'>(
  'humble_bundle_library',
  null
)
const apiInfoCache = new CacheStore<{ [key: string]: Subproduct }>(
  'humble_api_info'
)
const gridImageCache = new CacheStore<{ [key: string]: string }>(
  'humble_grid_cache'
)

const installStore = new CacheStore<HumbleBundleInstallInfo>(
  'humble_install_info'
)

export { configStore, libraryStore, apiInfoCache, gridImageCache, installStore }
