import { parseBackupDate, toIntlLocale } from 'common/utils'

describe('parseBackupDate', () => {
  test('parses ISO timestamps', () => {
    expect(parseBackupDate('2026-11-15T22:01:43.587Z')?.toISOString()).toBe(
      '2026-11-15T22:01:43.587Z'
    )
  })

  test('parses legacy sanitized timestamps', () => {
    expect(parseBackupDate('2026-11-15T22-01-43-587Z')?.toISOString()).toBe(
      '2026-11-15T22:01:43.587Z'
    )
    expect(parseBackupDate('2026-11-15T22-01-43-587Z-1')?.toISOString()).toBe(
      '2026-11-15T22:01:43.587Z'
    )
  })

  test('returns undefined for unknown formats', () => {
    expect(parseBackupDate('yesterday')).toBeUndefined()
  })
})

describe('toIntlLocale', () => {
  test('accepts underscore locale tags', () => {
    expect(toIntlLocale('pt_BR')).toBe('pt-BR')
    expect(toIntlLocale('en')).toBe('en')
  })

  test('falls back to english for unsupported tags', () => {
    expect(toIntlLocale('not-a-locale')).toBe('en')
  })
})
