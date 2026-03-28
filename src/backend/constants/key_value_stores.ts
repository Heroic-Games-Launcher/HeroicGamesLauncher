import { env } from 'process'
import { TypeCheckedStoreBackend } from '../electron_store'
import { join } from 'path'

export const storesPath = env.HEROIC_PROFILE
  ? join(env.HEROIC_PROFILE, 'stores')
  : 'stores'

export const cacheStoresPath = env.HEROIC_PROFILE
  ? join(env.HEROIC_PROFILE, 'store_cache')
  : 'store_cache'

export const gogStorePath = env.HEROIC_PROFILE
  ? join(env.HEROIC_PROFILE, 'gog_store')
  : 'gog_store'

export const nileStorePath = env.HEROIC_PROFILE
  ? join(env.HEROIC_PROFILE, 'nile_store')
  : 'nile_store'

export const sideloadAppsStorePath = env.HEROIC_PROFILE
  ? join(env.HEROIC_PROFILE, 'sideload_apps')
  : 'sideload_apps'

export const zoomStorePath = env.HEROIC_PROFILE
  ? join(env.HEROIC_PROFILE, 'zoom_store')
  : 'zoom_store'

export const configStore = new TypeCheckedStoreBackend('configStore', {
  cwd: storesPath
})

export const tsStore = new TypeCheckedStoreBackend('timestampStore', {
  cwd: storesPath,
  name: 'timestamp'
})
