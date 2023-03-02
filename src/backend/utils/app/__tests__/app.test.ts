import axios from 'axios'
import { app } from 'electron'
import { logError } from '../../../logger/logger'
import * as appUtils from '../app'
import { test_data } from './test_data/github-api-heroic-test-data.json'

jest.mock('electron')
jest.mock('../../../logger/logger')
jest.mock('../../../logger/logfile')
jest.mock('../../../dialog/dialog')

describe('utils.ts', () => {
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
        appUtils.testingExportsAppUtils.semverGt(versions.target, versions.base)
      ).toBe(expectValue)
    })
  })

  describe('getLatestReleases', () => {
    test('Simple version', async () => {
      jest.spyOn(axios, 'get').mockResolvedValue(test_data)
      jest.spyOn(app, 'getVersion').mockReturnValueOnce('2.4.0')

      const releases = await appUtils.getLatestReleases()
      expect(releases).toMatchInlineSnapshot(`
        Array [
          Object {
            "body": "2.5.2 HOTFIX #2 Release",
            "html_url": "https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/tag/v2.5.2",
            "id": 200,
            "name": "2.5.2 HOTFIX #2",
            "prerelease": false,
            "published_at": "2022-12-14T10:53:29Z",
            "tag_name": "v2.5.2",
            "type": "stable",
          },
          Object {
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
      jest.spyOn(axios, 'get').mockResolvedValue(test_data)
      jest.spyOn(app, 'getVersion').mockReturnValueOnce('2.5.5-beta.3')

      const releases = await appUtils.getLatestReleases()
      expect(releases).toMatchInlineSnapshot(`
        Array [
          Object {
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
      jest.spyOn(axios, 'get').mockResolvedValue(test_data)
      jest.spyOn(app, 'getVersion').mockReturnValueOnce('')

      const releases = await appUtils.getLatestReleases()
      expect(releases).toMatchInlineSnapshot(`Array []`)
    })

    test('Fetching available releases fails', async () => {
      jest.spyOn(axios, 'get').mockRejectedValue('Failed to fetch!')

      const releases = await appUtils.getLatestReleases()
      expect(logError).toBeCalledWith(
        ['Error when checking for Heroic updates', 'Failed to fetch!'],
        'Backend'
      )
      expect(releases).toMatchInlineSnapshot(`Array []`)
    })
  })
})
