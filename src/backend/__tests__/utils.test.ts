import { quoteIfNecessary, removeQuoteIfNecessary, semverGt } from '../utils'

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

  test('semverGt', () => {
    // target: vx.x.x or vx.x.x-beta.x
    // base: x.x.x or x.x.x-beta.x

    const testCases = new Map<{ target: string; base: string }, boolean>([
      [{ target: 'v2.3.10', base: '2.4.0-beta.1' }, false],
      [{ target: 'v2.3.10', base: '2.4.0' }, false],
      [{ target: 'v2.3.10', base: '2.3.9' }, true],
      [{ target: 'v2.3.10', base: '2.3.9-beta.3' }, true],
      [{ target: 'v2.4.0-beta.1', base: '2.3.10' }, true],
      [{ target: 'v2.4.0-beta.1', base: '2.4.0' }, false],
      [{ target: 'v2.4.0-beta.2', base: '2.4.0-beta.1' }, true],
      [{ target: 'v2.4.0-beta.1', base: '2.4.0-beta.2' }, false],
      [{ target: undefined as any, base: undefined as any }, false]
    ])

    testCases.forEach((expectValue, versions) => {
      expect(semverGt(versions.target, versions.base)).toBe(expectValue)
    })
  })
})
