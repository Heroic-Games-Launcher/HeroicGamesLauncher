import { WineInstallation } from 'common/types'
import { selectDefaultWineVersion } from '../selectDefaultWineVersion'

const wine = (
  bin: string,
  name: string,
  type: WineInstallation['type'] = 'proton'
): WineInstallation => ({ bin, name, type })

describe('selectDefaultWineVersion', () => {
  it('returns the configured version when it is installed', () => {
    const configured = wine('/proton/GE-Proton11-14/proton', 'GE-Proton11-14')
    const list = [
      wine('/proton/GE-Proton-latest/proton', 'GE-Proton-latest'),
      wine('/proton/GE-Proton11-14/proton', 'GE-Proton11-14')
    ]

    expect(selectDefaultWineVersion(configured, list)).toEqual({
      bin: '/proton/GE-Proton11-14/proton',
      name: 'GE-Proton11-14',
      type: 'proton'
    })
  })

  it('falls back to the first entry when the configured version is missing', () => {
    const configured = wine('/proton/GE-Proton10-1/proton', 'GE-Proton10-1')
    const list = [
      wine('/proton/GE-Proton-latest/proton', 'GE-Proton-latest'),
      wine('/proton/GE-Proton11-14/proton', 'GE-Proton11-14')
    ]

    expect(selectDefaultWineVersion(configured, list)?.bin).toBe(
      '/proton/GE-Proton-latest/proton'
    )
    expect(selectDefaultWineVersion(undefined, list)?.bin).toBe(
      '/proton/GE-Proton-latest/proton'
    )
    expect(selectDefaultWineVersion(null, list)?.bin).toBe(
      '/proton/GE-Proton-latest/proton'
    )
  })

  it('returns undefined for an empty list', () => {
    const configured = wine('/proton/GE-Proton11-14/proton', 'GE-Proton11-14')

    expect(selectDefaultWineVersion(configured, [])).toBeUndefined()
    expect(selectDefaultWineVersion(undefined, [])).toBeUndefined()
  })

  it('matches by binary path when display names are duplicated', () => {
    const configured = wine('/custom/wine/bin/wine', 'wine-ge-custom')
    const list = [
      wine('/lutris/wine-ge-custom/bin/wine', 'wine-ge-custom', 'wine'),
      wine('/custom/wine/bin/wine', 'wine-ge-custom', 'wine')
    ]

    expect(selectDefaultWineVersion(configured, list)?.bin).toBe(
      '/custom/wine/bin/wine'
    )
  })

  it('matches crossover entries by binary path as well', () => {
    const configured = wine(
      '/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine',
      'CrossOver',
      'crossover'
    )
    const list = [
      wine('/Users/me/wine/bin/wine', 'wine-8.0', 'wine'),
      wine(
        '/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine',
        'CrossOver',
        'crossover'
      )
    ]

    expect(selectDefaultWineVersion(configured, list)?.bin).toBe(
      '/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine'
    )
  })
})
