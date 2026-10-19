import { macWineDisplayName } from '../wine_names'

describe('macWineDisplayName', () => {
  test('keeps Latest distinct and shows the version it currently is', () => {
    expect(
      macWineDisplayName('Wine-Crossover-latest', 'Wine Crossover', '23.7.1')
    ).toBe('Wine Crossover Latest (23.7.1)')
    expect(
      macWineDisplayName(
        'Wine-crossover-wine-23.7.1-1',
        'Wine Crossover',
        '23.7.1'
      )
    ).toBe('Wine Crossover 23.7.1-1')
  })

  test('uses the folder version when the plist version was mangled', () => {
    expect(
      macWineDisplayName(
        'Wine-crossover-wine-23.0.1',
        'Wine Crossover',
        '230.1.'
      )
    ).toBe('Wine Crossover 23.0.1')
  })
})
