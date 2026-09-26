import Store from 'electron-store'
import { isAbsolute, join } from 'path'

import {
  StoreStructure,
  TypeCheckedStore,
  UnknownGuard,
  ValidStoreName
} from 'common/types/electron_store'
import { getXdgStoreDirectory } from 'common/xdg_store'
import {
  appFolder,
  heroicCachePath,
  heroicDataPath,
  heroicStatePath,
  legacyUserDataPath
} from 'backend/constants/paths'
import { Get } from 'type-fest'
import { moveSyncIfDestinationMissing } from './migration/migrations/xdg_helpers'

function getXdgRoot(directory: ReturnType<typeof getXdgStoreDirectory>) {
  switch (directory) {
    case 'data':
      return heroicDataPath
    case 'state':
      return heroicStatePath
    case 'cache':
      return heroicCachePath
    default:
      return null
  }
}

export function resolveStoreCwd(
  storeName: string,
  cwd: string | undefined
): string | undefined {
  if (
    process.platform !== 'linux' ||
    process.env.CI === 'e2e' ||
    !cwd ||
    isAbsolute(cwd)
  ) {
    return cwd
  }

  const root = getXdgRoot(getXdgStoreDirectory(storeName, cwd))
  return join(root ?? appFolder, cwd)
}

export function migrateStoreFile(
  storeName: string,
  legacyCwd: string | undefined,
  resolvedCwd: string | undefined,
  fileName: string
) {
  if (
    process.platform !== 'linux' ||
    process.env.CI === 'e2e' ||
    !legacyCwd ||
    !resolvedCwd ||
    legacyCwd === resolvedCwd
  ) {
    return
  }

  const sourceCwd = isAbsolute(legacyCwd)
    ? legacyCwd
    : join(legacyUserDataPath, legacyCwd)
  const source = join(sourceCwd, `${fileName}.json`)
  const destination = join(resolvedCwd, `${fileName}.json`)

  moveSyncIfDestinationMissing(source, destination)
}

export class TypeCheckedStoreBackend<
  Name extends ValidStoreName
> implements TypeCheckedStore<Name> {
  private store: Store

  constructor(name: Name, options: Store.Options<StoreStructure[Name]>) {
    const legacyCwd = options.cwd
    const resolvedCwd = resolveStoreCwd(name, legacyCwd)
    migrateStoreFile(name, legacyCwd, resolvedCwd, options.name ?? name)

    // @ts-expect-error This looks like a bug in electron-store's type definitions
    this.store = new Store({ ...options, cwd: resolvedCwd })
  }

  public has(key: string) {
    return this.store.has(key)
  }

  public get<KeyType extends string>(
    key: KeyType,
    defaultValue: NonNullable<UnknownGuard<Get<StoreStructure[Name], KeyType>>>
  ) {
    return this.store.get(key, defaultValue) as NonNullable<
      UnknownGuard<Get<StoreStructure[Name], KeyType>>
    >
  }

  public get_nodefault<KeyType extends string>(key: KeyType) {
    return this.store.get(key) as UnknownGuard<
      Get<StoreStructure[Name], KeyType> | undefined
    >
  }

  public set<KeyType extends string>(
    key: KeyType,
    value: UnknownGuard<Get<StoreStructure[Name], KeyType>>
  ) {
    this.store.set(key, value)
  }

  public delete<KeyType extends string>(key: KeyType) {
    this.store.delete(key)
  }

  public clear() {
    this.store.clear()
  }

  public get raw_store() {
    return this.store.store as StoreStructure[Name]
  }
}
