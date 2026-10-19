import { crossoverBottlesRoot } from '../crossover_bottles'

describe('crossoverBottlesRoot', () => {
  test('uses the folder CrossOver was given', () => {
    expect(crossoverBottlesRoot('/Users/me', '/Volumes/Bottles')).toBe(
      '/Volumes/Bottles'
    )
  })

  test('falls back to the default bottle folder', () => {
    expect(crossoverBottlesRoot('/Users/me', '  ')).toBe(
      '/Users/me/Library/Application Support/CrossOver/Bottles'
    )
  })
})
