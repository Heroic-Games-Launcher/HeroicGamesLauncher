import {
  dryRunLanguages,
  installLanguageArgs,
  toSteamApiLanguage
} from '../languages'

describe('toSteamApiLanguage', () => {
  it.each([
    ['en-US', 'english'],
    ['de', 'german'],
    ['pt_BR', 'brazilian'],
    ['pt-PT', 'portuguese'],
    ['zh-CN', 'schinese'],
    ['zh_Hant', 'tchinese'],
    ['es-419', 'latam'],
    ['es', 'spanish'],
    ['ko', 'koreana'],
    ['nb-NO', 'norwegian'],
    ['xx', 'english']
  ])('maps %s to %s', (code, steam) => {
    expect(toSteamApiLanguage(code)).toBe(steam)
  })
})

describe('dryRunLanguages', () => {
  it('is empty without a language list', () => {
    expect(dryRunLanguages({})).toBeUndefined()
    expect(dryRunLanguages({ languages: [] })).toBeUndefined()
  })

  it('sorts the list and adds display locales', () => {
    expect(
      dryRunLanguages({
        languages: ['schinese', 'english', 'german', 'latam', 'klingon'],
        default_language: 'english',
        installed_language: null
      })
    ).toEqual({
      languages: ['english', 'german', 'klingon', 'latam', 'schinese'],
      default_language: 'english',
      installed_language: undefined,
      language_locales: {
        english: 'en',
        german: 'de',
        klingon: 'klingon',
        latam: 'es-419',
        schinese: 'zh-Hans'
      }
    })
  })

  it('drops a default or current language not in the list', () => {
    const result = dryRunLanguages({
      languages: ['english', 'french'],
      default_language: 'german',
      installed_language: 'french'
    })
    expect(result?.default_language).toBeUndefined()
    expect(result?.installed_language).toBe('french')
  })
})

describe('installLanguageArgs', () => {
  it('passes a Steam language name', () => {
    expect(installLanguageArgs('german')).toEqual(['--language', 'german'])
    expect(installLanguageArgs('thai')).toEqual(['--language', 'thai'])
  })

  it.each([undefined, '', 'en-US', 'de', 'pt_BR', 'English'])(
    'skips %p',
    (value) => {
      expect(installLanguageArgs(value)).toEqual([])
    }
  )
})
