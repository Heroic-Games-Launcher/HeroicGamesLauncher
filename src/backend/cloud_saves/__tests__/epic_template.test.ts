import { resolveEpicTemplate } from '../epic_template'

const vars = {
  installPath: '/games/Game',
  accountId: 'account-id',
  home: '/home/user',
  appData: '/home/user/Library/Application Support',
  documents: '/home/user/Documents',
  windows: false
}

describe('resolveEpicTemplate', () => {
  test('resolves install dir and account id', () => {
    expect(resolveEpicTemplate('{installdir}/Saves/{epicid}', vars)).toBe(
      '/games/Game/Saves/account-id'
    )
  })

  test('resolves windows placeholders for wine prefixes', () => {
    const windows = { ...vars, windows: true }
    expect(
      resolveEpicTemplate(
        '{userprofile}/Documents/My Games/{appdata}/Game',
        windows
      )
    ).toBe('%USERPROFILE%/Documents/My Games/%LOCALAPPDATA%/Game')
  })

  test('resolves native host paths', () => {
    expect(
      resolveEpicTemplate('{appdata}/Game/{userdir}/{userlibrary}', vars)
    ).toBe(
      '/home/user/Library/Application Support/Game//home/user/Documents//home/user/Library'
    )
  })

  test('keeps unknown placeholders untouched', () => {
    expect(resolveEpicTemplate('{unknown}/saves', vars)).toBe('{unknown}/saves')
  })
})
