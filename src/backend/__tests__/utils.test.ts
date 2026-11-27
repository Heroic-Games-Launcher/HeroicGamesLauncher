import { axiosClient } from 'backend/utils'
import type { GameInfo } from 'common/types'
import { app } from 'electron'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
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

  describe('getRsyncMoveArgs', () => {
    test('uses only the options openrsync (macOS) understands', () => {
      expect(
        utils.getRsyncMoveArgs(
          'openrsync: protocol version 29\nrsync version 2.6.9 compatible\n',
          '/a/',
          '/b'
        )
      ).toEqual([
        '--archive',
        '--remove-source-files',
        '--progress',
        '/a/',
        '/b'
      ])
    })

    test('reports progress per file with GNU rsync', () => {
      expect(
        utils.getRsyncMoveArgs(
          'rsync  version 3.4.1  protocol version 32\n',
          '/a/',
          '/b'
        )
      ).toEqual([
        '--archive',
        '--compress',
        '--no-human-readable',
        '--remove-source-files',
        '--info=name,progress',
        '/a/',
        '/b'
      ])
    })
  })

  describe('moveOnUnix', () => {
    let root: string
    const gameInfo = (install_path: string) =>
      ({
        app_name: 'game',
        runner: 'gog',
        title: 'Game',
        install: { install_path }
      }) as GameInfo

    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), 'heroic-move-'))
      mkdirSync(join(root, 'from', 'Game', 'Data'), { recursive: true })
      writeFileSync(join(root, 'from', 'Game', 'game.exe'), 'exe')
      writeFileSync(join(root, 'from', 'Game', 'Data', 'pak0'), 'data')
      mkdirSync(join(root, 'to'))
    })
    afterEach(() => {
      chmodSync(join(root, 'to'), 0o755)
      rmSync(root, { recursive: true, force: true })
    })

    test('moves the game folder', async () => {
      const result = await utils.moveOnUnix(
        join(root, 'to'),
        gameInfo(join(root, 'from', 'Game'))
      )

      expect(result).toEqual({
        status: 'done',
        installPath: join(root, 'to', 'Game')
      })
      expect(
        readFileSync(join(root, 'to', 'Game', 'Data', 'pak0'), 'utf-8')
      ).toBe('data')
      expect(existsSync(join(root, 'from', 'Game'))).toBe(false)
    })

    const asUser = process.getuid?.() === 0 ? test.skip : test
    asUser('keeps the original when the copy fails', async () => {
      chmodSync(join(root, 'to'), 0o555)

      const result = await utils.moveOnUnix(
        join(root, 'to'),
        gameInfo(join(root, 'from', 'Game'))
      )

      expect(result.status).toBe('error')
      expect(
        readFileSync(join(root, 'from', 'Game', 'game.exe'), 'utf-8')
      ).toBe('exe')
    })
  })
})
