import { formatEpicTags } from '../tags'

describe('formatEpicTags', () => {
  test('turns Epic tag codes into sentence case', () => {
    expect(formatEpicTags(['PUZZLE', 'INDIE'])).toEqual(['Puzzle', 'Indie'])
  })

  test('joins multi-word codes with spaces', () => {
    expect(formatEpicTags(['SINGLE_PLAYER', 'ROGUE_LITE'])).toEqual([
      'Single player',
      'Rogue lite'
    ])
  })

  test('keeps known acronyms in upper case', () => {
    expect(formatEpicTags(['RPG', 'ACTION_RPG', 'FPS'])).toEqual([
      'RPG',
      'Action RPG',
      'FPS'
    ])
  })

  test('drops duplicates, empty values and non-string entries', () => {
    expect(formatEpicTags(['ACTION', 'action', '', '  ', 42, null])).toEqual([
      'Action'
    ])
  })

  test('returns an empty list when tags are missing or not an array', () => {
    expect(formatEpicTags(undefined)).toEqual([])
    expect(formatEpicTags('ACTION')).toEqual([])
  })
})
