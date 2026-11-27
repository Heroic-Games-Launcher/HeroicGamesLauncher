import { readFileSync } from 'fs'
import { join } from 'path'
import {
  formatMeasured,
  formatSpeed,
  MEBIBYTES,
  MEBIBYTES_PER_SECOND
} from '../format'

describe('formatMeasured', () => {
  it('keeps one decimal and drops a trailing zero', () => {
    expect(formatMeasured(45.0, MEBIBYTES_PER_SECOND)).toBe(
      `45\u00A0${MEBIBYTES_PER_SECOND}`
    )
    expect(formatMeasured(45.34, MEBIBYTES_PER_SECOND)).toBe(
      `45.3\u00A0${MEBIBYTES_PER_SECOND}`
    )
    expect(formatMeasured(45.32, MEBIBYTES_PER_SECOND)).toBe(
      `45.3\u00A0${MEBIBYTES_PER_SECOND}`
    )
    expect(formatMeasured(45, MEBIBYTES_PER_SECOND)).toBe(
      `45\u00A0${MEBIBYTES_PER_SECOND}`
    )
    expect(formatMeasured(512.34, MEBIBYTES)).toBe(`512.3\u00A0${MEBIBYTES}`)
  })

  it('separates the value from the unit with a non-breaking space', () => {
    expect(formatMeasured(1, MEBIBYTES)).toContain('\u00A0')
    expect(formatMeasured(1, MEBIBYTES)).not.toContain(' ')
  })

  it('renders a genuine zero as a value, not as unknown', () => {
    expect(formatMeasured(0, MEBIBYTES)).toBe(`0\u00A0${MEBIBYTES}`)
    expect(formatMeasured(0, MEBIBYTES_PER_SECOND)).toBe(
      `0\u00A0${MEBIBYTES_PER_SECOND}`
    )
  })

  it('renders an em dash when the value is unknown', () => {
    expect(formatMeasured(undefined, MEBIBYTES)).toBe('—')
    expect(formatMeasured(null, MEBIBYTES)).toBe('—')
    expect(formatMeasured(Number.NaN, MEBIBYTES)).toBe('—')
  })
})

describe('formatSpeed wrapper', () => {
  it('renders MiB/s and MB/s', () => {
    expect(formatSpeed(45.3, 'mib')).toBe('45.3\u00A0MiB/s')
    expect(formatSpeed(45.3, 'mb')).toBe('47.5\u00A0MB/s')
  })

  it('converts then rounds once', () => {
    expect(formatSpeed(45, 'mb')).toBe('47.2\u00A0MB/s')
  })

  it('keeps the em dash in MB mode', () => {
    expect(formatSpeed(undefined, 'mb')).toBe('—')
    expect(formatSpeed(undefined, 'mb')).not.toContain('NaN')
  })

  it('renders a genuine zero', () => {
    expect(formatSpeed(0, 'mb')).toBe('0\u00A0MB/s')
  })

  it('drops a trailing zero after conversion', () => {
    expect(formatSpeed(1, 'mb')).toBe('1\u00A0MB/s')
  })

  it('keeps the English catalog free of unit values', () => {
    const catalog = JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/locales/en/translation.json')
      ).toString()
    ) as Record<string, unknown>

    const strings: string[] = []
    const walk = (value: unknown) => {
      if (typeof value === 'string') strings.push(value)
      else if (value && typeof value === 'object') {
        Object.values(value).forEach(walk)
      }
    }
    walk(catalog)

    expect(strings).not.toContain('MB/s')
    expect(strings).not.toContain('MiB/s')
    expect(
      (catalog['download-manager'] as { label: Record<string, string> }).label
    ).not.toHaveProperty('unit')

    const settings = catalog['setting'] as Record<string, string>
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('units')) {
        expect(`${key}: ${value}`).not.toMatch(/MiB|MB/)
      }
    }
  })
})
