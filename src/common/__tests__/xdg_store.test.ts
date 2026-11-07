import { getXdgStoreDirectory, resolveXdgHome } from '../xdg_store'

describe('XDG store routing', () => {
  test('routes stores by persistence semantics', () => {
    expect(getXdgStoreDirectory('wineDownloaderInfoStore', 'store')).toBe(
      'data'
    )
    expect(getXdgStoreDirectory('downloadManager', 'store')).toBe('state')
    expect(getXdgStoreDirectory('fontsStore', 'store')).toBe('cache')
    expect(getXdgStoreDirectory('anything', 'store_cache')).toBe('cache')
    expect(getXdgStoreDirectory('configStore', 'store')).toBeNull()
  })

  test('accepts only absolute XDG base directory overrides', () => {
    expect(resolveXdgHome('/tmp/xdg', '/fallback')).toBe('/tmp/xdg')
    expect(resolveXdgHome('relative/path', '/fallback')).toBe('/fallback')
    expect(resolveXdgHome(undefined, '/fallback')).toBe('/fallback')
  })
})
