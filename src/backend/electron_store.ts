import Store from 'electron-store'

import {
  StoreStructure,
  TypeCheckedStore,
  UnknownGuard,
  ValidStoreName
} from 'common/types/electron_store'
import { Get } from 'type-fest'

export class TypeCheckedStoreBackend<Name extends ValidStoreName>
  implements TypeCheckedStore<Name>
{
  private store: Store

  constructor(name: Name, options: Store.Options<StoreStructure[Name]>) {
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
