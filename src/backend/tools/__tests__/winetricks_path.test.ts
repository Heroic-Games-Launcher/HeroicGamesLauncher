import { findCommand, withMacToolPath } from '../winetricks_path'

describe('mac winetricks tool path', () => {
  test('searches Homebrew on both architectures and MacPorts', () => {
    expect(withMacToolPath('/usr/bin')).toBe(
      '/opt/homebrew/bin:/usr/local/bin:/opt/local/bin:/usr/bin'
    )
  })

  test('prefers 7z and falls back to 7zz', () => {
    expect(
      findCommand(['7z', '7zz'], ['/opt/homebrew/bin'], (path) =>
        path.endsWith('/7zz')
      )
    ).toBe('/opt/homebrew/bin/7zz')
    expect(
      findCommand(['7z', '7zz'], ['/usr/local/bin'], (path) =>
        path.endsWith('/7z')
      )
    ).toBe('/usr/local/bin/7z')
  })
})
