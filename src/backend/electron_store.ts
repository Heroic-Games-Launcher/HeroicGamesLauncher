import Store from 'electron-store'
import { app } from 'electron'
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'

import {
  StoreStructure,
  TypeCheckedStore,
  UnknownGuard,
  ValidStoreName
} from 'common/types/electron_store'
import { Get } from 'type-fest'
import { rewriteRetiredUserPaths } from './utils/home_paths'

let migratedHomes = false

function migrateRetiredHome(cwd: string | undefined) {
  if (migratedHomes || process.env.JEST_WORKER_ID) return
  migratedHomes = true
  if (process.platform !== 'darwin' || !cwd) return

  let home = ''
  try {
    home = app.getPath('home')
  } catch {
    return
  }
  if (!home.startsWith('/Users/')) return

  let names: string[] = []
  try {
    names = readdirSync(cwd)
  } catch {
    return
  }

  for (const name of names) {
    if (!name.endsWith('.json')) continue
    try {
      const file = join(cwd, name)
      const parsed = JSON.parse(readFileSync(file, 'utf-8'))
      const result = rewriteRetiredUserPaths(parsed, home, existsSync)
      if (result.changed) {
        writeFileSync(file, JSON.stringify(result.value, null, 2))
      }
    } catch {
      // Not one of Heroic's JSON stores
    }
  }
}

function safeUserData(): string | undefined {
  try {
    return app.getPath('userData')
  } catch {
    return undefined
  }
}

export class TypeCheckedStoreBackend<
  Name extends ValidStoreName
> implements TypeCheckedStore<Name> {
  private store: Store

  constructor(name: Name, options: Store.Options<StoreStructure[Name]>) {
    const cwd = typeof options.cwd === 'string' ? options.cwd : safeUserData()
    migrateRetiredHome(cwd)
    // @ts-expect-error This looks like a bug in electron-store's type definitions
    this.store = new Store(options)
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
