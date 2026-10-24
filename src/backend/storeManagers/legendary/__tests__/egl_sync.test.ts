import { shouldAdoptEglPrefix } from '../egl_sync'

describe('shouldAdoptEglPrefix', () => {
  test('points a game newly imported from the Epic launcher at the synced prefix', () => {
    expect(
      shouldAdoptEglPrefix({
        addedBySync: true,
        eglGuid: 'abc',
        installPath: '/Games/Epic/Game',
        eglPrefix: '/Prefixes/EGL',
        currentPrefix: '/Prefixes/default',
        fallbackPrefix: '/Prefixes/default',
        hasExplicitPrefix: false
      })
    ).toBe(true)
  })

  test('leaves a game alone when the user already picked a prefix for it', () => {
    expect(
      shouldAdoptEglPrefix({
        addedBySync: false,
        eglGuid: 'abc',
        installPath: '/Prefixes/EGL/drive_c/Games/Game',
        eglPrefix: '/Prefixes/EGL',
        currentPrefix: '/Prefixes/Custom',
        fallbackPrefix: '/Prefixes/default',
        hasExplicitPrefix: true
      })
    ).toBe(false)
  })

  test('ignores games Heroic installed outside the Epic launcher', () => {
    expect(
      shouldAdoptEglPrefix({
        addedBySync: false,
        eglGuid: '',
        installPath: '/Games/Heroic/Game',
        eglPrefix: '/Prefixes/EGL',
        currentPrefix: '/Prefixes/default',
        fallbackPrefix: '/Prefixes/default',
        hasExplicitPrefix: false
      })
    ).toBe(false)
  })
})
