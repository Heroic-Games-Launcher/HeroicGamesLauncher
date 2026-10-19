import { gogUpdateAvailable } from '../update_check'

describe('gogUpdateAvailable', () => {
  test('does not update when this platform is already on the current build', () => {
    expect(
      gogUpdateAvailable({
        installedBuild: 'mac-2',
        latestBuild: 'mac-2',
        responseStatus: 200,
        responseEtag: '"other"'
      }).update
    ).toBe(false)
  })

  test('flags an update when the platform build changed', () => {
    expect(
      gogUpdateAvailable({
        installedBuild: 'mac-1',
        latestBuild: 'mac-2',
        responseStatus: 200,
        responseEtag: '"other"'
      }).update
    ).toBe(true)
  })

  test('treats a weak etag as the same tag', () => {
    expect(
      gogUpdateAvailable({
        installedEtag: '"abc"',
        responseStatus: 200,
        responseEtag: 'W/"abc"'
      }).update
    ).toBe(false)
  })

  test('records the first etag instead of downloading the game again', () => {
    expect(
      gogUpdateAvailable({
        responseStatus: 200,
        responseEtag: '"abc"'
      })
    ).toEqual({ update: false, etagToStore: '"abc"' })
  })
})
