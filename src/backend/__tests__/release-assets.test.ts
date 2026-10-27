import { selectAppImageAsset } from '../../../flathub/release-assets'

const asset = (arch: string) => ({
  name: `Heroic-2.22.1-linux-${arch}.AppImage`,
  browser_download_url: `https://example.invalid/v2.22.1/Heroic-2.22.1-linux-${arch}.AppImage`,
  size: 123
})

test('selects x86_64 even when ARM64 is listed first', () => {
  const x64 = asset('x86_64')
  expect(selectAppImageAsset([asset('arm64'), x64], 'x86_64')).toBe(x64)
})

test('selects ARM64 even when x86_64 is listed first', () => {
  const arm = asset('arm64')
  expect(selectAppImageAsset([asset('x86_64'), arm], 'arm64')).toBe(arm)
})

test('does not substitute another architecture or accept a blockmap', () => {
  const blockmap = {
    browser_download_url: `${asset('x86_64').browser_download_url}.blockmap`
  }
  expect(() =>
    selectAppImageAsset([asset('arm64'), blockmap], 'x86_64')
  ).toThrow('No Linux x86_64 AppImage in this release')
  expect(() => selectAppImageAsset([], 'arm64')).toThrow(
    'No Linux arm64 AppImage in this release'
  )
})
