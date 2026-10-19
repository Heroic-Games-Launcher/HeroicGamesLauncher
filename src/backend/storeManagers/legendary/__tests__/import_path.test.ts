import { legendaryImportDirectory } from '../import_path'

describe('legendaryImportDirectory', () => {
  test('gives Legendary the folder that contains the app', () => {
    expect(
      legendaryImportDirectory(
        '/Volumes/Games/AShortHike.app',
        'AShortHike.app/Contents/MacOS/A Short Hike'
      )
    ).toBe('/Volumes/Games')
  })

  test('keeps the app when the manifest paths are inside it', () => {
    expect(
      legendaryImportDirectory(
        '/Volumes/Games/AShortHike.app',
        'Contents/MacOS/A Short Hike'
      )
    ).toBe('/Volumes/Games/AShortHike.app')
  })
})
