import { quoteIfNecessary, removeQuoteIfNecessary } from '../utils'

jest.mock('../logger/logfile')

describe('electron/utils.ts', () => {
  test('quoteIfNeccessary', () => {
    const testCases = new Map<string, string>([
      ['path/without/spaces', 'path/without/spaces'],
      ['path/with /spaces', '"path/with /spaces"'],
      ['"path/quoted/without/spaces"', '"path/quoted/without/spaces"'],
      ['"path/quoted/with /spaces"', '"path/quoted/with /spaces"']
    ])

    testCases.forEach((expectString, inputString) => {
      expect(quoteIfNecessary(inputString)).toStrictEqual(expectString)
    })
  })

  test('removeQuotesIfNeccessary', () => {
    const testCases = new Map<string, string>([
      ['path/without/quotes', 'path/without/quotes'],
      ['"path/with/quotes"', 'path/with/quotes']
    ])

    testCases.forEach((expectString, inputString) => {
      expect(removeQuoteIfNecessary(inputString)).toStrictEqual(expectString)
    })
  })
})
