import {
  macGameBinary,
  machArchitectures,
  shouldLaunchWithRosetta
} from '../mach'

describe('Rosetta launch decision', () => {
  const arm64 = Buffer.alloc(8)
  arm64.writeUInt32LE(0xfeedfacf, 0)
  arm64.writeUInt32LE(0x0100000c, 4)

  const intel = Buffer.alloc(8)
  intel.writeUInt32LE(0xfeedfacf, 0)
  intel.writeUInt32LE(0x01000007, 4)

  const universal = Buffer.alloc(8 + 40)
  universal.writeUInt32BE(0xcafebabe, 0)
  universal.writeUInt32BE(2, 4)
  universal.writeUInt32BE(0x01000007, 8)
  universal.writeUInt32BE(0x0100000c, 28)

  test('reads thin and universal Mach-O headers', () => {
    expect(machArchitectures(arm64)).toEqual(['arm64'])
    expect(machArchitectures(intel)).toEqual(['x86_64'])
    expect(machArchitectures(universal)).toEqual(['x86_64', 'arm64'])
  })

  test('runs Intel-only games with Rosetta and honors an explicit request', () => {
    expect(shouldLaunchWithRosetta(intel, false, true)).toBe(true)
    expect(shouldLaunchWithRosetta(arm64, false, true)).toBe(false)
    expect(shouldLaunchWithRosetta(universal, false, true)).toBe(false)
    expect(shouldLaunchWithRosetta(universal, true, true)).toBe(true)
    expect(shouldLaunchWithRosetta(intel, true, false)).toBe(false)
  })

  test('resolves the executable inside an app bundle regardless of trailing slash or case', () => {
    expect(
      macGameBinary('/Games', 'Resonance.app', (app) =>
        app.endsWith('Resonance.app') ? 'AGS' : undefined
      )
    ).toBe('/Games/Resonance.app/Contents/MacOS/AGS')
    expect(
      macGameBinary('/Games/Resonance.App/', '', (app) =>
        app === '/Games/Resonance.App' ? 'AGS' : undefined
      )
    ).toBe('/Games/Resonance.App/Contents/MacOS/AGS')
  })
})
