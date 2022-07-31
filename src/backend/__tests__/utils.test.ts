import { quoteIfNecessary, removeQuoteIfNecessary } from '../utils'

jest.mock('../logger/logger', () => {
  const original = jest.requireActual('../logger/logger')
  return {
    ...original,
    createNewLogFileAndClearOldOnces: jest.fn().mockReturnValue('')
  }
})

describe('electron/utils.ts', () => {
  test('quoteIfNeccessary', () => {
    const testCases = new Map<string, string>([
      ['path/without/spaces', 'path/without/spaces'],
      ['path/with /spaces', '"path/with /spaces"'],
      ['"path/with /start/quote', '""path/with /start/quote"'],
      ['path/with /end/quote"', '"path/with /end/quote""'],
      ['"path/quoted/without/spaces"', '"path/quoted/without/spaces"'],
      ['"path/quoted/with /spaces"', '"path/quoted/with /spaces"'],
      [undefined as any, 'undefined']
    ])

    testCases.forEach((expectString, inputString) => {
      expect(quoteIfNecessary(inputString)).toStrictEqual(expectString)
    })
  })

  test('removeQuotesIfNeccessary', () => {
    const testCases = new Map<string, string>([
      ['path/without/quotes', 'path/without/quotes'],
      ['"path/with/quotes"', 'path/with/quotes'],
      ['"path/with/start/quote', '"path/with/start/quote'],
      ['path/with/end/quote"', 'path/with/end/quote"'],
      [undefined as any, 'undefined']
    ])

    testCases.forEach((expectString, inputString) => {
      expect(removeQuoteIfNecessary(inputString)).toStrictEqual(expectString)
    })
  })
})
