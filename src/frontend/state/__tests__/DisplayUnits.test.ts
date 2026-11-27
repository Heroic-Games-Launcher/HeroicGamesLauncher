import { useDisplayUnits } from '../DisplayUnits'

describe('useDisplayUnits', () => {
  it('defaults to mib when no setting was loaded', () => {
    expect(useDisplayUnits.getState().units).toBe('mib')
  })

  it('updates readers when the setting flips', () => {
    useDisplayUnits.getState().setUnits('mb')
    expect(useDisplayUnits.getState().units).toBe('mb')

    useDisplayUnits.getState().setUnits('mib')
  })
})
