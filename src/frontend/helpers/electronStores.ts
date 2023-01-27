import { Get } from 'type-fest'

import {
  ValidStoreName,
  StoreOptions,
  StoreStructure,
  TypeCheckedStore,
  UnknownGuard
} from 'common/types/electron_store'

export class TypeCheckedStoreFrontend<
  Name extends ValidStoreName,
  Structure extends StoreStructure[Name]
> implements TypeCheckedStore<Name, Structure>
{
  private storeName: ValidStoreName

  constructor(name: Name, options: StoreOptions<Structure>) {
    this.storeName = name
    // @ts-expect-error This looks like a bug in electron-store's type definitions
    window.api.storeNew(name, options)
  }

  public has(key: string) {
    return window.api.storeHas(this.storeName, key)
  }

  public get<KeyType extends string>(
    key: KeyType,
    defaultValue: NonNullable<UnknownGuard<Get<Structure, KeyType>>>
  ) {
    return window.api.storeGet(
      this.storeName,
      key,
      defaultValue
    ) as NonNullable<UnknownGuard<Get<Structure, KeyType>>>
  }

  public get_nodefault<KeyType extends string>(key: KeyType) {
    return window.api.storeGet(this.storeName, key) as UnknownGuard<
      Get<Structure, KeyType> | undefined
    >
  }

  public set<KeyType extends string>(
    key: KeyType,
    value: UnknownGuard<Get<Structure, KeyType>>
  ) {
    window.api.storeSet(this.storeName, key, value)
  }

  public delete() {
    throw new Error('Not implemented for TypeCheckedStoreFrontend')
  }

  public clear() {
    throw new Error('Not implemented for TypeCheckedStoreFrontend')
  }
}

const configStore = new TypeCheckedStoreFrontend('configStore', {
  cwd: 'store'
})

const libraryStore = new TypeCheckedStoreFrontend('libraryStore', {
  cwd: 'lib-cache',
  name: 'library'
})

const wineDownloaderInfoStore = new TypeCheckedStoreFrontend(
  'wineDownloaderInfoStore',
  {
    cwd: 'store',
    name: 'wine-downloader-info'
  }
)

const gogLibraryStore = new TypeCheckedStoreFrontend('gogLibraryStore', {
  cwd: 'gog_store',
  name: 'library'
})
const gogInstalledGamesStore = new TypeCheckedStoreFrontend(
  'gogInstalledGamesStore',
  {
    cwd: 'gog_store',
    name: 'installed'
  }
)
const gogConfigStore = new TypeCheckedStoreFrontend('gogConfigStore', {
  cwd: 'gog_store'
})

const timestampStore = new TypeCheckedStoreFrontend('timestampStore', {
  cwd: 'store',
  name: 'timestamp'
})

const sideloadLibrary = new TypeCheckedStoreFrontend('sideloadedStore', {
  cwd: 'sideload_apps',
  name: 'library'
})

const downloadManagerStore = new TypeCheckedStoreFrontend('downloadManager', {
  cwd: 'store',
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
  downloadManagerStore
}
