import { deduplicateWineInstallationsByRealPath } from '../compatibility_layers'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'graceful-fs'
import { join, sep } from 'path'
import { tmpdir } from 'os'
import { WineInstallation } from 'common/types'
import { getWineVersionSourceLabels } from 'common/utils'

describe('deduplicateWineInstallationsByRealPath', () => {
  let tempDir = ''

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('keeps the first entry when two binary paths resolve to the same file', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'heroic-wine-installations-'))
    mkdirSync(join(tempDir, 'alias'))
    const first: WineInstallation = {
      bin: join(tempDir, 'proton'),
      name: 'GE-Proton Latest',
      type: 'proton'
    }
    const duplicate: WineInstallation = {
      ...first,
      bin: `${tempDir}${sep}alias${sep}..${sep}proton`
    }
    writeFileSync(first.bin, '')

    expect([
      ...deduplicateWineInstallationsByRealPath([first, duplicate])
    ]).toEqual([first])
  })

  it('keeps different copies with the same name', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'heroic-wine-installations-'))
    const first: WineInstallation = {
      bin: join(tempDir, 'heroic', 'proton'),
      name: 'GE-Proton Latest',
      type: 'proton'
    }
    const second: WineInstallation = {
      bin: join(tempDir, 'steam', 'proton'),
      name: 'GE-Proton Latest',
      type: 'proton'
    }
    mkdirSync(join(tempDir, 'heroic'))
    mkdirSync(join(tempDir, 'steam'))
    writeFileSync(first.bin, '')
    writeFileSync(second.bin, '')

    expect([
      ...deduplicateWineInstallationsByRealPath([first, second])
    ]).toEqual([first, second])
  })

  it('labels same-named Heroic and Steam Proton installations by source', () => {
    const versions: WineInstallation[] = [
      {
        bin: '/home/user/.config/heroic/tools/proton/GE-Proton/proton',
        name: 'GE-Proton',
        type: 'proton'
      },
      {
        bin: '/home/user/.local/share/Steam/compatibilitytools.d/GE-Proton/proton',
        name: 'GE-Proton',
        type: 'proton'
      }
    ]

    expect(getWineVersionSourceLabels(versions)).toEqual(['Heroic', 'Steam'])
  })

  it('uses full paths when same-name installations share a source', () => {
    const versions: WineInstallation[] = [
      {
        bin: '/home/user/SteamA/compatibilitytools.d/GE-Proton/proton',
        name: 'GE-Proton',
        type: 'proton'
      },
      {
        bin: '/home/user/SteamB/compatibilitytools.d/GE-Proton/proton',
        name: 'GE-Proton',
        type: 'proton'
      }
    ]

    expect(getWineVersionSourceLabels(versions)).toEqual(
      versions.map(({ bin }) => bin)
    )
  })

  it('leaves unique version names without a source suffix', () => {
    const versions: WineInstallation[] = [
      { bin: '/tools/wine/wine', name: 'Wine Stable', type: 'wine' }
    ]

    expect(getWineVersionSourceLabels(versions)).toEqual([''])
  })
})
