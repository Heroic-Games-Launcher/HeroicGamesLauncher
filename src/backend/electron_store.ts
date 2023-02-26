import Store from 'electron-store'

import {
  StoreStructure,
  TypeCheckedStore,
  UnknownGuard,
  ValidStoreName
} from 'common/types/electron_store'
import { Get } from 'type-fest'

export class TypeCheckedStoreBackend<
  Name extends ValidStoreName,
  Structure extends StoreStructure[Name]
> implements TypeCheckedStore<Name, Structure>
{
  private store: Store

  constructor(name: Name, options: Store.Options<Structure>) {
    // @ts-expect-error This looks like a bug in electron-store's type definitions
    this.store = new Store(options)
  }

  public has(key: string) {
    return this.store.has(key)
  }

  public get<KeyType extends string>(
    key: KeyType,
    defaultValue: NonNullable<UnknownGuard<Get<Structure, KeyType>>>
  ) {
    return this.store.get(key, defaultValue) as NonNullable<
      UnknownGuard<Get<Structure, KeyType>>
    >
  }

  public get_nodefault<KeyType extends string>(key: KeyType) {
    return this.store.get(key) as UnknownGuard<
      Get<Structure, KeyType> | undefined
    >
  }

  public set<KeyType extends string>(
    key: KeyType,
    value: UnknownGuard<Get<Structure, KeyType>>
  ) {
    this.store.set(key, value)
  }

  public delete<KeyType extends string>(key: KeyType) {
    this.store.delete(key)
  }

  public clear() {
    this.store.clear()
  }
}
