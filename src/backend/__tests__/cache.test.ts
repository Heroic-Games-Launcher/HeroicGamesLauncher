import Store from 'electron-store'
import CacheStore from '../cache'

jest.mock('electron-store')

describe('backend/cache.ts', () => {
  const testStore = new CacheStore<string>('test_store')
  const internalStore = new Store({
    cwd: 'store_cache',
    name: 'test_store'
  })

  const now = new Date()
  jest.useFakeTimers().setSystemTime(now)

  afterEach(testStore.clear)
  afterAll(jest.useRealTimers)

  test('Value is written', () => {
    testStore.set('foo', 'bar')
    expect(internalStore.get('foo')).toBe('bar')
  })

  test('Timestamp is written', () => {
    testStore.set('foo', 'bar')
    expect(internalStore.get('__timestamp.foo')).toBe(now.toString())
  })

  test('Valid value is returned', () => {
    testStore.set('foo', 'bar')
    expect(testStore.get('foo')).toBe('bar')
  })

  test('Invalid value is cleared', () => {
    const eight_hours_ago = new Date(now).setHours(now.getHours() - 8)
    jest.setSystemTime(eight_hours_ago)
    testStore.set('foo', 'bar')
    jest.setSystemTime(now)
    expect(testStore.get('foo')).toBe(undefined)
    expect(internalStore.has('foo')).toBe(false)
    expect(internalStore.has('__timestamp.foo')).toBe(false)
  })

  test('Custom lifetime works', () => {
    const testStore2 = new CacheStore<string>('test_store_2', 60)
    const three_hours_ago = new Date(now).setHours(now.getHours() - 3)
    jest.setSystemTime(three_hours_ago)
    testStore2.set('foo', 'bar')
    jest.setSystemTime(now)
    expect(testStore2.get('foo')).toBe(undefined)
  })

  test('Allows having no expiration time', () => {
    const testStore2 = new CacheStore<string>('test_store_2', null)
    const three_hours_ago = new Date(now).setHours(now.getHours() - 3)
    jest.setSystemTime(three_hours_ago)
    testStore2.set('foo', 'bar')
    jest.setSystemTime(now)
    expect(testStore2.get('foo')).toBe('bar')
  })
})
