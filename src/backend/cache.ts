import Store from 'electron-store'

export default class CacheStore<ValueType, KeyType extends string = string> {
  private readonly store: Store
  private readonly lifespan: number

  /**
   * Creates a new cache store
   * @param filename
   * @param max_value_lifespan How long an individual entry in the store will
   *                           be cached (in minutes)
   */
  constructor(filename: string, max_value_lifespan = 60 * 6) {
    this.store = new Store({
      cwd: 'store_cache',
      name: filename,
      clearInvalidConfig: true
    })
    this.lifespan = max_value_lifespan
  }

  public get(key: KeyType): ValueType | undefined
  public get(key: KeyType, fallback: ValueType): ValueType
  public get(key: KeyType, fallback?: ValueType) {
    if (!this.store.has(key)) {
      return fallback
    }

    const lastUpdateTimestamp = this.store.get(`__timestamp.${key}`) as
      | string
      | undefined
    if (!lastUpdateTimestamp) {
      return fallback
    }
    const updateDate = new Date(lastUpdateTimestamp)
    const msSinceUpdate = Date.now() - updateDate.getTime()
    const minutesSinceUpdate = msSinceUpdate / 1000 / 60
    if (minutesSinceUpdate > this.lifespan) {
      this.store.delete(key)
      this.store.delete(`__timestamp.${key}`)
      return fallback
    }

    return this.store.get(key) as ValueType
  }

  public set(key: KeyType, value: ValueType) {
    this.store.set(key, value)
    this.store.set(`__timestamp.${key}`, Date())
  }

  public delete(key: KeyType) {
    this.store.delete(key)
    this.store.delete(`__timestamp.${key}`)
  }

  public clear = () => this.store.clear()
}
