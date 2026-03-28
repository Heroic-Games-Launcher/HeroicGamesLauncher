import { Get } from 'type-fest'

import {
  ValidStoreName,
  StoreOptions,
  StoreStructure,
  TypeCheckedStore,
  UnknownGuard
} from 'common/types/electron_store'
import { GameInfo } from 'common/types'

const profilePrefix =
  window.heroicProfile === 'default' ? '' : `${window.heroicProfile}/`

const storesPath = window.heroicProfile ? `${profilePrefix}stores` : 'stores'

const cacheStoresPath = window.heroicProfile
  ? `${profilePrefix}store_cache`
  : 'store_cache'

const gogStorePath = window.heroicProfile
  ? `${profilePrefix}gog_store`
  : 'gog_store'

const nileStorePath = window.heroicProfile
  ? `${profilePrefix}nile_store`
  : 'nile_store'

const sideloadAppsStorePath = window.heroicProfile
  ? `${profilePrefix}sideload_apps`
  : 'sideload_apps'

const zoomStorePath = window.heroicProfile
  ? `${profilePrefix}zoom_store`
  : 'zoom_store'

export class TypeCheckedStoreFrontend<
  Name extends ValidStoreName
> implements TypeCheckedStore<Name> {
  private storeName: ValidStoreName

  constructor(name: Name, options: StoreOptions<StoreStructure[Name]>) {
    this.storeName = name
    // @ts-expect-error This looks like a bug in electron-store's type definitions
    window.api.storeNew(name, options)
  }

  public has(key: string) {
    return window.api.storeHas(this.storeName, key)
  }

  public get<KeyType extends string>(
    key: KeyType,
    defaultValue: NonNullable<UnknownGuard<Get<StoreStructure[Name], KeyType>>>
  ) {
    return window.api.storeGet(
      this.storeName,
      key,
      defaultValue
    ) as NonNullable<UnknownGuard<Get<StoreStructure[Name], KeyType>>>
  }

  public get_nodefault<KeyType extends string>(key: KeyType) {
    return window.api.storeGet(this.storeName, key) as UnknownGuard<
      Get<StoreStructure[Name], KeyType> | undefined
    >
  }

  public set<KeyType extends string>(
    key: KeyType,
    value: UnknownGuard<Get<StoreStructure[Name], KeyType>>
  ) {
    window.api.storeSet(this.storeName, key, value)
  }

  public delete<KeyType extends string>(key: KeyType) {
    window.api.storeDelete(this.storeName, key)
  }

  public clear() {
    throw new Error('Not implemented for TypeCheckedStoreFrontend')
  }
}

class CacheStore<ValueType, KeyType extends string = string> {
  private readonly storeName: string
  private readonly lifespan: number | null

  /**
   * Creates a new cache store
   * @param filename
   * @param max_value_lifespan How long an individual entry in the store will
   *                           be cached (in minutes)
   */
  constructor(filename: string, max_value_lifespan: number | null = 60 * 6) {
    this.storeName = filename
    window.api.storeNew(filename, {
      cwd: cacheStoresPath,
      name: filename,
      clearInvalidConfig: true
    })
    this.lifespan = max_value_lifespan
  }

  public get(key: KeyType): ValueType | undefined
  public get(key: KeyType, fallback: ValueType): ValueType
  public get(key: KeyType, fallback?: ValueType) {
    if (!window.api.storeHas(this.storeName, key)) {
      return fallback
    }

    const lastUpdateTimestamp = window.api.storeGet(
      this.storeName,
      `__timestamp.${key}`
    ) as string | undefined
    if (!lastUpdateTimestamp) {
      return fallback
    }
    const updateDate = new Date(lastUpdateTimestamp)
    const msSinceUpdate = Date.now() - updateDate.getTime()
    const minutesSinceUpdate = msSinceUpdate / 1000 / 60
    if (this.lifespan && minutesSinceUpdate > this.lifespan) {
      window.api.storeDelete(this.storeName, key)
      window.api.storeDelete(this.storeName, `__timestamp.${key}`)
      return
    }

    return window.api.storeGet(this.storeName, key) as ValueType
  }

  public set(key: KeyType, value: ValueType) {
    window.api.storeSet(this.storeName, key, value)
    window.api.storeSet(this.storeName, `__timestamp.${key}`, Date())
  }
}

const configStore = new TypeCheckedStoreFrontend('configStore', {
  cwd: storesPath
})

const libraryStore = new CacheStore<GameInfo[], 'library'>(
  'legendary_library',
  null
)

const wineDownloaderInfoStore = new TypeCheckedStoreFrontend(
  'wineDownloaderInfoStore',
  {
    cwd: storesPath,
    name: 'wine-downloader-info'
  }
)

const gogLibraryStore = new CacheStore<GameInfo[], 'games'>('gog_library', null)
const gogInstalledGamesStore = new TypeCheckedStoreFrontend(
  'gogInstalledGamesStore',
  {
    cwd: gogStorePath,
    name: 'installed'
  }
)
const gogConfigStore = new TypeCheckedStoreFrontend('gogConfigStore', {
  cwd: gogStorePath
})

const zoomLibraryStore = new CacheStore<GameInfo[], 'games'>(
  'zoom_library',
  null
)
const zoomInstalledGamesStore = new TypeCheckedStoreFrontend(
  'zoomInstalledGamesStore',
  {
    cwd: zoomStorePath,
    name: 'installed'
  }
)
const zoomConfigStore = new TypeCheckedStoreFrontend('zoomConfigStore', {
  cwd: zoomStorePath
})

const nileLibraryStore = new CacheStore<GameInfo[], 'library'>(
  'nile_library',
  null
)
const nileConfigStore = new TypeCheckedStoreFrontend('nileConfigStore', {
  cwd: nileStorePath
})

const timestampStore = new TypeCheckedStoreFrontend('timestampStore', {
  cwd: storesPath,
  name: 'timestamp'
})

const sideloadLibrary = new TypeCheckedStoreFrontend('sideloadedStore', {
  cwd: sideloadAppsStorePath,
  name: 'library'
})

const downloadManagerStore = new TypeCheckedStoreFrontend('downloadManager', {
  cwd: storesPath,
  name: 'download-manager'
})

export {
  configStore,
  gogLibraryStore,
  gogInstalledGamesStore,
  gogConfigStore,
  libraryStore,
  timestampStore,
  sideloadLibrary,
  wineDownloaderInfoStore,
  downloadManagerStore,
  nileLibraryStore,
  nileConfigStore,
  zoomLibraryStore,
  zoomInstalledGamesStore,
  zoomConfigStore
}
