import { buildAureliaLaunchOptions, quoteToken } from '../launch_options'

describe('quoteToken', () => {
  it('leaves plain words alone', () => {
    expect(quoteToken('-windowed')).toBe('-windowed')
    expect(quoteToken('/usr/bin/gamemoderun')).toBe('/usr/bin/gamemoderun')
  })

  it('quotes spaces, quotes and empty words', () => {
    expect(quoteToken('two words')).toBe("'two words'")
    expect(quoteToken("it's")).toBe("'it'\\''s'")
    expect(quoteToken('')).toBe("''")
    expect(quoteToken('$HOME')).toBe("'$HOME'")
  })
})

describe('buildAureliaLaunchOptions', () => {
  it('is empty without settings', () => {
    expect(buildAureliaLaunchOptions({ env: {}, wrappers: [] })).toEqual({
      line: '',
      skippedEnv: []
    })
  })

  it('passes plain game arguments without a marker', () => {
    const { line } = buildAureliaLaunchOptions({
      env: {},
      wrappers: [],
      launcherArgs: '-novid -name "Big Bob"'
    })
    expect(line).toBe("-novid -name 'Big Bob'")
  })

  it('puts env and wrappers before the marker, arguments after', () => {
    const { line } = buildAureliaLaunchOptions({
      env: { DXVK_HUD: 'fps', PATH_EXTRA: '/a b' },
      wrappers: ['gamescope', '-w', '1280', '--', '/usr/bin/gamemoderun'],
      launcherArgs: '-dev'
    })
    expect(line).toBe(
      "DXVK_HUD=fps PATH_EXTRA='/a b' gamescope -w 1280 -- /usr/bin/gamemoderun %command% -dev"
    )
  })

  it('keeps a Steam-style line from the arguments field', () => {
    const { line } = buildAureliaLaunchOptions({
      env: { A: '1' },
      wrappers: ['mangohud'],
      launcherArgs: 'strace -f %command% +map test'
    })
    expect(line).toBe('A=1 mangohud strace -f %command% +map test')
  })

  it('skips environment names Aurelia would not accept', () => {
    const { line, skippedEnv } = buildAureliaLaunchOptions({
      env: { 'BAD-NAME': 'x', GOOD: 'y' },
      wrappers: []
    })
    expect(skippedEnv).toEqual(['BAD-NAME'])
    expect(line).toBe('GOOD=y %command%')
  })
})
