import { gogInstallDirectory } from '../install_path'

describe('gogInstallDirectory', () => {
  test('finds the app a pkg installer left behind', () => {
    expect(
      gogInstallDirectory('/Games/Heroic', 'Lands Of Lore', [
        'Lands Of Lore.app',
        'support'
      ])
    ).toBe('/Games/Heroic/Lands Of Lore.app')
  })

  test('keeps the folder when it is there', () => {
    expect(
      gogInstallDirectory('/Games/Heroic', 'Lands Of Lore', ['Lands Of Lore'])
    ).toBe('/Games/Heroic/Lands Of Lore')
  })
})
