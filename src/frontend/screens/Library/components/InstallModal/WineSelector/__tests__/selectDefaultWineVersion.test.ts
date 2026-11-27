import { WineInstallation } from 'common/types'
import {
  isWineVersionListed,
  repickWineVersion,
  selectDefaultWineVersion
} from '../selectDefaultWineVersion'

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

describe('repickWineVersion', () => {
  const configured = wine('/proton/GE-Proton11-14/proton', 'GE-Proton11-14')
  const alias = wine('/proton/GE-Proton-latest/proton', 'GE-Proton-latest')

  it('re-applies the configured default after a parent reset', () => {
    expect(
      repickWineVersion(undefined, configured, [alias, configured], false)?.bin
    ).toBe(configured.bin)
  })

  it('falls back to the first entry when the configured version is gone', () => {
    expect(repickWineVersion(undefined, configured, [alias], false)?.bin).toBe(
      alias.bin
    )
  })

  it('never replaces a user pick on a refetch', () => {
    const picked = wine('/wine/8.0/bin/wine', 'wine-8.0', 'wine')

    expect(
      repickWineVersion(picked, configured, [picked, alias, configured], true)
        ?.bin
    ).toBe(picked.bin)
  })
})

describe('repickWineVersion rebin', () => {
  it('returns the list entry, not the caller object, when the name changed', () => {
    const stale = wine('/opt/wine/bin/wine', 'wine-8.0', 'wine')
    const renamed = wine('/opt/wine/bin/wine', 'wine-9.0', 'wine')

    const result = repickWineVersion(stale, undefined, [renamed], true)

    expect(result).toBe(renamed)
    expect(result?.name).toBe('wine-9.0')
  })
})

describe('repickWineVersion dropped picks', () => {
  const configured = wine('/proton/GE-Proton11-14/proton', 'GE-Proton11-14')
  const alias = wine('/proton/GE-Proton-latest/proton', 'GE-Proton-latest')

  it('clears a dropped user pick instead of swapping to the default', () => {
    const picked = wine('/gone/wine/bin/wine', 'wine-9', 'wine')

    expect(repickWineVersion(picked, configured, [alias], true)).toBeUndefined()
  })

  it('reports a dropped selection as unlisted so install can be blocked', () => {
    const picked = wine('/gone/wine/bin/wine', 'wine-9', 'wine')

    expect(isWineVersionListed(picked, [alias])).toBe(false)
    expect(isWineVersionListed(alias, [alias])).toBe(true)
    expect(isWineVersionListed(undefined, [alias])).toBe(false)
  })

  it('re-picks the default for a dropped selection the user did not make', () => {
    const stale = wine('/gone/wine/bin/wine', 'wine-9', 'wine')

    expect(
      repickWineVersion(stale, configured, [alias, configured], false)?.bin
    ).toBe(configured.bin)
  })
})
