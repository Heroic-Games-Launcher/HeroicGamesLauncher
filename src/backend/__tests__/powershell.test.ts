import { toPowerShellArgumentList } from '../launcher'

describe('toPowerShellArgumentList', () => {
  test('preserves Windows paths without doubling backslashes', () => {
    expect(
      toPowerShellArgumentList([
        'install',
        '--base-path',
        'C:\\Games\\Amazon',
        'amzn1.adg.product.6463784a-5716-481d-b006-e19c26e9214c'
      ])
    ).toBe(
      '"`"install`"","`"--base-path`"","`"C:\\Games\\Amazon`"","`"amzn1.adg.product.6463784a-5716-481d-b006-e19c26e9214c`""'
    )
  })
})
