import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  UNREAL_PROFILES,
  applyTweaksToIni,
  syncUnrealTweaks,
  type UnrealTweak
} from '../unreal'

const TWEAKS: UnrealTweak[] = [
  { cvar: 'r.FilmGrain', value: '0', reason: 'test' },
  { cvar: 'r.SceneColorFringeQuality', value: '0', reason: 'test' }
]
const OWNED = TWEAKS.map(({ cvar }) => cvar)

describe('applyTweaksToIni', () => {
  test('adds a [SystemSettings] section if there is none', () => {
    expect(applyTweaksToIni('', OWNED, TWEAKS)).toBe(
      '[SystemSettings]\nr.FilmGrain=0\nr.SceneColorFringeQuality=0\n'
    )
    expect(applyTweaksToIni('[Core.System]\nA=1', OWNED, TWEAKS)).toBe(
      '[Core.System]\nA=1\n\n[SystemSettings]\nr.FilmGrain=0\nr.SceneColorFringeQuality=0\n'
    )
  })

  test('keeps user settings and replaces owned keys in [SystemSettings]', () => {
    const ini = [
      '[Core.System]',
      'Paths=../../../Engine/Content',
      '',
      '[SystemSettings]',
      'r.VSync=0',
      'R.FILMGRAIN=1',
      '',
      '[/Script/Engine.RendererSettings]',
      'r.SceneColorFringeQuality=1'
    ].join('\n')

    expect(applyTweaksToIni(ini, OWNED, TWEAKS)).toBe(
      [
        '[Core.System]',
        'Paths=../../../Engine/Content',
        '',
        '[SystemSettings]',
        'r.VSync=0',
        'r.FilmGrain=0',
        'r.SceneColorFringeQuality=0',
        '',
        // Only [SystemSettings] is managed, other sections are left alone
        '[/Script/Engine.RendererSettings]',
        'r.SceneColorFringeQuality=1',
        ''
      ].join('\n')
    )
  })

  test('is idempotent and merges duplicate sections like Unreal', () => {
    const once = applyTweaksToIni(
      '[SystemSettings]\nr.VSync=0\n',
      OWNED,
      TWEAKS
    )
    expect(once).toBe(
      '[SystemSettings]\nr.VSync=0\nr.FilmGrain=0\nr.SceneColorFringeQuality=0\n'
    )
    expect(applyTweaksToIni(once, OWNED, TWEAKS)).toBe(once)

    const duplicated =
      '[SystemSettings]\nr.VSync=0\n\n[SystemSettings]\nr.FilmGrain=1\n'
    expect(applyTweaksToIni(duplicated, OWNED, TWEAKS)).toBe(once)
  })

  test('leaves files without owned keys untouched when disabled', () => {
    const ini = '[SystemSettings]\n\nr.VSync=0\n\n\n'
    expect(applyTweaksToIni(ini, OWNED, [])).toBe(ini)
  })

  test('removes the managed values and empty sections when disabled', () => {
    const applied = applyTweaksToIni('[Core.System]\nA=1\n', OWNED, TWEAKS)
    expect(applyTweaksToIni(applied, OWNED, [])).toBe('[Core.System]\nA=1\n')
    expect(
      applyTweaksToIni(applyTweaksToIni('', OWNED, TWEAKS), OWNED, [])
    ).toBe('')
  })

  test('keeps Windows line endings', () => {
    const result = applyTweaksToIni('[Core.System]\r\nA=1\r\n', OWNED, TWEAKS)
    expect(result).toContain('[Core.System]\r\nA=1\r\n')
    expect(result.replace(/\r\n/g, '')).not.toContain('\n')
  })
})

describe('syncUnrealTweaks', () => {
  const profile = UNREAL_PROFILES.find(({ id }) => id === 'hellblade2')!
  let root: string
  let prefix: string
  let gameRoot: string
  let engineIni: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-unreal-'))
    prefix = join(root, 'prefix')
    gameRoot = join(root, 'game')
    mkdirSync(join(gameRoot, profile.shippingBinary, '..'), { recursive: true })
    writeFileSync(join(gameRoot, profile.shippingBinary), '')

    mkdirSync(join(prefix, 'drive_c', 'users', 'Public'), { recursive: true })
    const configDir = join(
      prefix,
      'drive_c/users/crossover/AppData/Local',
      profile.project,
      'Saved/Config/Windows'
    )
    mkdirSync(configDir, { recursive: true })
    engineIni = join(configDir, 'Engine.ini')
    writeFileSync(engineIni, '[Core.System]\nA=1\n')
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  test('applies, keeps and removes the tweaks of a recognized game', async () => {
    chmodSync(engineIni, 0o444)

    expect(await syncUnrealTweaks(prefix, [gameRoot], true)).toContain(
      'Applied Unreal Engine tweaks'
    )
    const content = readFileSync(engineIni, 'utf-8')
    for (const { cvar, value } of profile.tweaks) {
      expect(content).toContain(`${cvar}=${value}`)
    }
    expect(statSync(engineIni).mode & 0o200).toBeTruthy()

    expect(await syncUnrealTweaks(prefix, [gameRoot], true)).toBeUndefined()

    expect(await syncUnrealTweaks(prefix, [gameRoot], false)).toContain(
      'Removed'
    )
    expect(readFileSync(engineIni, 'utf-8')).toBe('[Core.System]\nA=1\n')
  })

  test('ignores games without a profile', async () => {
    expect(await syncUnrealTweaks(prefix, [root], true)).toBeUndefined()
    expect(readFileSync(engineIni, 'utf-8')).toBe('[Core.System]\nA=1\n')
  })
})
