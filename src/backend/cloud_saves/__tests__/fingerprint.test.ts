import { getSavePathFingerprint } from '../fingerprint'

const gameInfo = {
  install: { install_path: '/games/heroic/Game', platform: 'windows' }
} as unknown as Parameters<typeof getSavePathFingerprint>[0]

const settings = {
  winePrefix: '/prefixes/game',
  wineVersion: { bin: '/proton', name: 'Proton - GE-Proton9', type: 'proton' }
} as unknown as Parameters<typeof getSavePathFingerprint>[1]

describe('getSavePathFingerprint', () => {
  test('is stable for the same configuration', () => {
    expect(getSavePathFingerprint(gameInfo, settings)).toBe(
      getSavePathFingerprint({ ...gameInfo }, { ...settings })
    )
  })

  test('changes when the prefix changes', () => {
    expect(
      getSavePathFingerprint(gameInfo, {
        ...settings,
        winePrefix: '/prefixes/other'
      })
    ).not.toBe(getSavePathFingerprint(gameInfo, settings))
  })

  test('changes when the wine version type changes', () => {
    expect(
      getSavePathFingerprint(gameInfo, {
        ...settings,
        wineVersion: { bin: '/wine', name: 'Wine - Wine-GE', type: 'wine' }
      })
    ).not.toBe(getSavePathFingerprint(gameInfo, settings))
  })

  test('changes when the game is installed elsewhere', () => {
    expect(
      getSavePathFingerprint(
        { install: { install_path: '/games/other', platform: 'windows' } },
        settings
      )
    ).not.toBe(getSavePathFingerprint(gameInfo, settings))
  })
})
