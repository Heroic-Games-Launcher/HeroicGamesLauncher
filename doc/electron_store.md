Similar to our IPC system, we also type-check our Electron Stores. If you want to use its functionality in your code, remember:

- Use `TypeCheckedStoreBackend` and `TypeCheckedStoreFrontend`
- Modifying our list of stores (adding new ones, changing the structure) can be done in `src/common/types/electron_store.ts`  
  Note that you'll have to be _very_ careful when changing an existing store's structure, as the old structure does not get converted to
  your new format automatically (to facilitate this, you can use [migrations](https://github.com/sindresorhus/electron-store#migrations))
- When accessing elements, use `<store>.get` with a default value, or `<store>.get_nodefault` if you can't/don't want to
  provide a default

Specific store structure notes:

- If you have a store with pre-set keys, you can just add those keys into the interface:
  ```ts
  interface StoreStructure {
    // ...
    myStoreName: {
      myKey: boolean /* or any other type here */
    }
  }
  ```
- If your store's keys are set dynamically (for example, a store that uses AppNames as keys), you can use
  [Index Signatures](https://www.typescriptlang.org/docs/handbook/2/objects.html#index-signatures) instead:
  ```ts
  interface StoreStructure {
    // ...
    myStoreName: {
      [key: string]: boolean /* or any other type here */
    }
  }
  ```
