import { useDisplayUnits } from 'frontend/state/DisplayUnits'
import { getProgressSummary } from '../getProgressSummary'

describe('getProgressSummary', () => {
  it('renders the downloaded amount and percent in MiB', () => {
    expect(getProgressSummary({ bytes: 512.3, percent: 45, eta: '' })).toBe(
      '(512.3\u00A0MiB · 45%)'
    )
  })

  it('does not flip an already completed row when the units change', () => {
    const completed = { bytes: 512.3, percent: 100, eta: '' }

    expect(getProgressSummary(completed)).toBe('(512.3\u00A0MiB · 100%)')

    useDisplayUnits.getState().setUnits('mb')

    expect(getProgressSummary(completed)).toBe('(512.3\u00A0MiB · 100%)')

    useDisplayUnits.getState().setUnits('mib')
  })

  it('drops the value segment when the runner reported no bytes', () => {
    expect(getProgressSummary({ percent: 45, eta: '' })).toBe('(45%)')
  })

  it('still shows a percent when none was reported', () => {
    expect(getProgressSummary({ eta: '' })).toBe('(0%)')
  })
})
