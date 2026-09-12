import { buildMacOsShortcutLaunchCommand } from '../macos_shortcut'

describe('macOS shortcuts', () => {
  test('quotes the launch URL as one shell argument', () => {
    expect(
      buildMacOsShortcutLaunchCommand(
        '/Applications/Heroic.app/Contents/MacOS/Heroic',
        'test-app',
        'sideload'
      )
    ).toBe(
      '/Applications/Heroic.app/Contents/MacOS/Heroic --no-gui "heroic://launch?appName=test-app&runner=sideload"'
    )
  })
})
