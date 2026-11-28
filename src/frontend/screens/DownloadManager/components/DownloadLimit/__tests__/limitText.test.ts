import { mibPerSecondFromKbit } from 'common/format'
import { PRESETS_KBIT, equivalentText, rateText } from '../limitText'

describe('limit text', () => {
  it('converts kbit to MiB/s', () => {
    expect(mibPerSecondFromKbit(400000)).toBeCloseTo(47.6837, 4)
    expect(mibPerSecondFromKbit(1000000)).toBeCloseTo(119.2093, 4)
    expect(mibPerSecondFromKbit(10000)).toBeCloseTo(1.1921, 4)
  })

  it('renders the rate with the Mbit/s constant', () => {
    expect(rateText(10000)).toBe('10\u00A0Mbit/s')
    expect(rateText(8000)).toBe('8\u00A0Mbit/s')
    expect(rateText(12345)).toBe('12.3\u00A0Mbit/s')
    expect(rateText(1000000)).toBe('1000\u00A0Mbit/s')
  })

  it('renders the equivalent in the selected units', () => {
    expect(equivalentText(400000, 'mib')).toBe('47.7\u00A0MiB/s')
    expect(equivalentText(400000, 'mb')).toBe('50\u00A0MB/s')
    expect(equivalentText(1000000, 'mb')).toBe('125\u00A0MB/s')
    expect(equivalentText(10000, 'mb')).toBe('1.3\u00A0MB/s')
    expect(equivalentText(10000, 'mib')).toBe('1.2\u00A0MiB/s')
  })

  it('keeps the documented preset list in kbit', () => {
    expect(PRESETS_KBIT).toEqual([
      10000, 25000, 50000, 100000, 250000, 500000, 1000000
    ])
  })
})
