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

  test('matches an app bundle by its goggame info file before falling back to name', () => {
    expect(
      gogInstallDirectory(
        '/Games/Heroic',
        'lands_of_lore',
        ['OtherGame.app', 'The Throne of Chaos.app'],
        (entry) => entry === 'The Throne of Chaos.app'
      )
    ).toBe('/Games/Heroic/The Throne of Chaos.app')
  })

  test('does not pick an unrelated app in a shared install folder', () => {
    expect(
      gogInstallDirectory('/Games/Heroic', 'Lands Of Lore', ['Cyberpunk.app'])
    ).toBe('/Games/Heroic/Lands Of Lore')
  })

  test('keeps the folder when it is there', () => {
    expect(
      gogInstallDirectory('/Games/Heroic', 'Lands Of Lore', ['Lands Of Lore'])
    ).toBe('/Games/Heroic/Lands Of Lore')
  })
})
