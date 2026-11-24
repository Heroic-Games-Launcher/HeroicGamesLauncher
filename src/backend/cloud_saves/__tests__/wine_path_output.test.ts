import { extractWinePath } from '../wine_path_output'

describe('extractWinePath', () => {
  test('returns a clean unix path', () => {
    expect(extractWinePath('/home/user/.wine/drive_c/test\n', 'unix')).toBe(
      '/home/user/.wine/drive_c/test'
    )
  })

  test('strips ansi codes and the umu status suffix', () => {
    expect(
      extractWinePath(
        '\x1b[0m/home/user/saves/My Games/Game\x1b[0m\nCommand exited with status: 0\n',
        'unix'
      )
    ).toBe('/home/user/saves/My Games/Game')
  })

  test('picks the path when other lines are mixed in', () => {
    expect(
      extractWinePath(
        'info: something\n/home/user/saves\nwarning: noise\n',
        'unix'
      )
    ).toBe('/home/user/saves')
  })

  test('returns an empty string when there is no valid path', () => {
    expect(extractWinePath('command not found\n', 'unix')).toBe('')
    expect(extractWinePath('Z:\\home\\user\\saves\n', 'win')).toBe(
      'Z:\\home\\user\\saves'
    )
    expect(extractWinePath('nothing\n', 'win')).toBe('')
  })
})
