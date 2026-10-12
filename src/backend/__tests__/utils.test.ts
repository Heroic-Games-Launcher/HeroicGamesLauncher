import { axiosClient } from 'backend/utils'
import { app } from 'electron'
import { logError } from '../logger'
import * as utils from '../utils'
import { test_data } from './test_data/github-api-heroic-test-data.json'

jest.mock('electron')
jest.mock('../logger')
jest.mock('../dialog/dialog')

describe('backend/utils.ts', () => {
  test('quoteIfNeccessary', () => {
    const testCases = new Map<string, string>([
      ['path/without/spaces', 'path/without/spaces'],
      ['path/with /spaces', '"path/with /spaces"'],
      ['"path/quoted/without/spaces"', '"path/quoted/without/spaces"'],
      ['"path/quoted/with /spaces"', '"path/quoted/with /spaces"']
    ])

    testCases.forEach((expectString, inputString) => {
      expect(utils.quoteIfNecessary(inputString)).toStrictEqual(expectString)
    })
  })

  test('removeQuotesIfNeccessary', () => {
    const testCases = new Map<string, string>([
      ['path/without/quotes', 'path/without/quotes'],
      ['"path/with/quotes"', 'path/with/quotes']
    ])

    testCases.forEach((expectString, inputString) => {
      expect(utils.removeQuoteIfNecessary(inputString)).toStrictEqual(
        expectString
      )
    })
  })

  test('semverGt', () => {
    // target: vx.x.x or vx.x.x-beta.x
    // base: x.x.x or x.x.x-beta.x

    const testCases = new Map<{ target: string; base: string }, boolean>([
      [{ target: 'v2.3.10', base: '2.4.0-beta.1' }, false],
      [{ target: 'v2.3.10', base: '2.4.0' }, false],
      [{ target: 'v2.3.10', base: '2.3.9' }, true],
      [{ target: 'v2.3.10', base: '2.3.9-beta.3' }, true],
      [{ target: 'v2.4.0-beta.1', base: '2.3.10' }, true],
      [{ target: 'v2.4.0-beta.1', base: '2.4.0' }, false],
      [{ target: 'v2.4.0-beta.2', base: '2.4.0-beta.1' }, true],
      [{ target: 'v2.4.0-beta.1', base: '2.4.0-beta.2' }, false],
      [{ target: undefined as any, base: undefined as any }, false]
    ])

    testCases.forEach((expectValue, versions) => {
      expect(
        utils.testingExportsUtils.semverGt(versions.target, versions.base)
      ).toBe(expectValue)
    })
  })

  describe('getLatestReleases', () => {
    test('Simple version', async () => {
      jest.spyOn(axiosClient, 'get').mockResolvedValue(test_data)
      jest.spyOn(app, 'getVersion').mockReturnValueOnce('2.4.0')

      const releases = await utils.getLatestReleases()
      expect(releases).toMatchInlineSnapshot(`
        [
          {
            "body": "2.5.2 HOTFIX #2 Release",
            "html_url": "https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/tag/v2.5.2",
            "id": 200,
            "name": "2.5.2 HOTFIX #2",
            "prerelease": false,
            "published_at": "2022-12-14T10:53:29Z",
            "tag_name": "v2.5.2",
            "type": "stable",
          },
          {
            "body": "2.6.0 Beta Release",
            "html_url": "https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/tag/v2.6.0-beta.1",
            "id": 100,
            "name": "2.6.0 Beta",
            "prerelease": true,
            "published_at": "2022-13-14T10:53:29Z",
            "tag_name": "v2.6.0-beta.1",
            "type": "beta",
          },
        ]
      `)
    })

    test('Complex version', async () => {
      jest.spyOn(axiosClient, 'get').mockResolvedValue(test_data)
      jest.spyOn(app, 'getVersion').mockReturnValueOnce('2.5.5-beta.3')

      const releases = await utils.getLatestReleases()
      expect(releases).toMatchInlineSnapshot(`
        [
          {
            "body": "2.6.0 Beta Release",
            "html_url": "https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/tag/v2.6.0-beta.1",
            "id": 100,
            "name": "2.6.0 Beta",
            "prerelease": true,
            "published_at": "2022-13-14T10:53:29Z",
            "tag_name": "v2.6.0-beta.1",
            "type": "beta",
          },
        ]
      `)
    })

    test('Empty version', async () => {
      jest.spyOn(axiosClient, 'get').mockResolvedValue(test_data)
      jest.spyOn(app, 'getVersion').mockReturnValueOnce('')

      const releases = await utils.getLatestReleases()
      expect(releases).toMatchInlineSnapshot(`[]`)
    })

    test('Fetching available releases fails', async () => {
      jest.spyOn(axiosClient, 'get').mockRejectedValue('Failed to fetch!')

      const releases = await utils.getLatestReleases()
      expect(logError).toBeCalledWith(
        ['Error when checking for Heroic updates', 'Failed to fetch!'],
        'Backend'
      )
      expect(releases).toMatchInlineSnapshot(`[]`)
    })
  })
})

describe('getMoveInstallError', () => {
  const installPath = '/games/Gunslugs'

  test.each([
    // the game ends up in <new path>/Gunslugs
    ['/games/Gunslugs2', 'a sibling whose name starts the same'],
    ['/games/Gunslugs2/', 'the same with a trailing slash'],
    ['/other', 'an unrelated folder'],
    ['/', 'the root folder']
  ])('allows moving to %s (%s)', (newPath) => {
    expect(utils.getMoveInstallError(installPath, newPath)).toBeNull()
  })

  test.each([
    ['/games', 'the parent: the destination is the install folder itself'],
    ['/games/', 'the same with a trailing slash'],
    ['/games/Gunslugs', 'the install folder itself'],
    ['/games/Gunslugs/sub', 'a folder inside the install folder']
  ])('refuses moving to %s (%s)', (newPath) => {
    expect(utils.getMoveInstallError(installPath, newPath)).not.toBeNull()
  })

  test('refuses a destination that contains the install folder', () => {
    // destination /games/Gunslugs is a parent of the install folder
    expect(
      utils.getMoveInstallError('/games/Gunslugs/old/Gunslugs', '/games')
    ).not.toBeNull()
  })
})
