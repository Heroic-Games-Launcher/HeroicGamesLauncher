import { join } from 'path'
import { wrapperWineBinary } from '../compatibility_layers'

describe('wrapperWineBinary', () => {
  test('uses wine64 when it is there, otherwise wine', () => {
    const dir = '/wrappers/Game.app/Contents/SharedSupport/wine/bin'
    expect(wrapperWineBinary(dir, (path) => path.endsWith('/wine64'))).toBe(
      join(dir, 'wine64')
    )
    expect(wrapperWineBinary(dir, (path) => path.endsWith('/wine'))).toBe(
      join(dir, 'wine')
    )
    expect(wrapperWineBinary(dir, () => false)).toBeUndefined()
  })
})
