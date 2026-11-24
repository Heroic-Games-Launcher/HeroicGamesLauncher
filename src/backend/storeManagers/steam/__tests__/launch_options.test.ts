import {
  aureliaPrefixArgs,
  buildAureliaLaunchOptions,
  quoteToken
} from '../launch_options'

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

  it('puts plain arguments after Heroic wrappers', () => {
    const { line } = buildAureliaLaunchOptions({
      env: {},
      wrappers: ['/usr/bin/gamemoderun'],
      launcherArgs: '-novid +fps_max 144'
    })
    expect(line).toBe('/usr/bin/gamemoderun %command% -novid +fps_max 144')
  })

  it('moves leading user env in front of gamescope', () => {
    const { line } = buildAureliaLaunchOptions({
      env: { DXVK_HUD: 'fps' },
      wrappers: ['gamescope', '-f', '--'],
      launcherArgs: 'PROTON_LOG=1 %command%'
    })
    expect(line).toBe('DXVK_HUD=fps PROTON_LOG=1 gamescope -f -- %command%')
  })

  it('keeps user wrappers and arguments in order', () => {
    const { line } = buildAureliaLaunchOptions({
      env: { A: '1', PROTON_LOG: '0' },
      wrappers: ['gamescope', '--', '/usr/bin/gamemoderun'],
      launcherArgs: 'PROTON_LOG=1 B=2 strace -f %command% -dev +map test'
    })
    expect(line).toBe(
      'A=1 PROTON_LOG=1 B=2 gamescope -- /usr/bin/gamemoderun strace -f %command% -dev +map test'
    )
  })

  it('keeps an assignment after a user wrapper as its argument', () => {
    const { line } = buildAureliaLaunchOptions({
      env: {},
      wrappers: ['mangohud'],
      launcherArgs: 'env X=1 %command%'
    })
    expect(line).toBe('mangohud env X=1 %command%')
  })

  it('requotes user values with spaces', () => {
    const { line } = buildAureliaLaunchOptions({
      env: { HEROIC: 'a b' },
      wrappers: ['gamescope', '--'],
      launcherArgs:
        'MY_VAR="two words" "OTHER=it\'s" "/opt/my tools/wrap" %command% -name \'Big Bob\''
    })
    expect(line).toBe(
      "HEROIC='a b' MY_VAR='two words' OTHER='it'\\''s' gamescope -- '/opt/my tools/wrap' %command% -name 'Big Bob'"
    )
  })

  it('joins Heroic and user DLL overrides', () => {
    const { line } = buildAureliaLaunchOptions({
      env: { WINEDLLOVERRIDES: 'winmm=n,b' },
      wrappers: [],
      launcherArgs: 'WINEDLLOVERRIDES="dinput8=n,b" %command%'
    })
    expect(line).toBe("WINEDLLOVERRIDES='winmm=n,b;dinput8=n,b' %command%")
  })

  it('passes a lone user marker through', () => {
    const { line } = buildAureliaLaunchOptions({
      env: {},
      wrappers: [],
      launcherArgs: 'FOO=1 %command%'
    })
    expect(line).toBe('FOO=1 %command%')
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

describe('aureliaPrefixArgs', () => {
  it('clears the prefix when empty', () => {
    expect(aureliaPrefixArgs(undefined, '/home/u')).toEqual(['--no-prefix'])
    expect(aureliaPrefixArgs('  ', '/home/u')).toEqual(['--no-prefix'])
  })

  it('expands a leading tilde only', () => {
    expect(aureliaPrefixArgs(' ~/Games/Elden ', '/home/u')).toEqual([
      '--prefix',
      '/home/u/Games/Elden'
    ])
    expect(aureliaPrefixArgs('~', '/home/u')).toEqual(['--prefix', '/home/u'])
    expect(aureliaPrefixArgs('/g/~x', '/home/u')).toEqual(['--prefix', '/g/~x'])
    expect(aureliaPrefixArgs('~bob/x', '/home/u')).toEqual([
      '--prefix',
      '~bob/x'
    ])
  })
})
