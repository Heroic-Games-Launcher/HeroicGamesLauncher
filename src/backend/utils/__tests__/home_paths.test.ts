import { rewriteRetiredUserPaths } from '../home_paths'

describe('rewriteRetiredUserPaths', () => {
  test('rewrites paths from a home directory that no longer exists', () => {
    const result = rewriteRetiredUserPaths(
      {
        winePrefix: '/Users/old/Library/Application Support/heroic/prefix',
        external: '/Volumes/Games/Heroic',
        stillThere: '/Users/roommate/Games'
      },
      '/Users/new',
      (home) => home === '/Users/roommate'
    )
    expect(result.changed).toBe(true)
    expect(result.value).toEqual({
      winePrefix: '/Users/new/Library/Application Support/heroic/prefix',
      external: '/Volumes/Games/Heroic',
      stillThere: '/Users/roommate/Games'
    })
  })
})
