import { Repositorys, VersionInfo } from 'common/types'
import { getAvailableVersions } from '../../main'
import { test_data_release_list } from '../test_data/github-api-test-data.json'
import { axiosClient } from 'backend/utils'
import { logError } from 'backend/logger/logger'

jest.mock('backend/logger/logger')
jest.mock('backend/logger/logfile')

describe('Main - GetAvailableVersions', () => {
  test('fetch releases succesfully', async () => {
    axiosClient.get = jest.fn().mockResolvedValue(test_data_release_list)

    await getAvailableVersions({}).then((releases: VersionInfo[]) => {
      expect(releases).not.toBe([])
      expect(releases.length).toBeGreaterThan(0)
      expect(releases[3].version).toContain('6.16-GE-1')
    })

    expect(axiosClient.get).toBeCalledWith(
      'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
    )
    expect(logError).not.toBeCalled()
  })

  test('fetch releases succesfully independent', async () => {
    axiosClient.get = jest.fn().mockResolvedValue(test_data_release_list)

    for (let key = 0; key < Object.keys(Repositorys).length / 2; key++) {
      await getAvailableVersions({
        repositorys: [key]
      }).then((releases: VersionInfo[]) => {
        expect(releases).not.toBe([])
        expect(releases.length).toBeGreaterThan(0)
        expect(releases[3].version).toContain('6.16-GE-1')
      })

      expect(axiosClient.get).toBeCalledWith(
        'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
      )
      expect(logError).not.toBeCalled()
    }
  })

  test('fetch releases failed because of 404', async () => {
    axiosClient.get = jest.fn().mockRejectedValue('Could not fetch tag 404')

    for (let key = 0; key < Object.keys(Repositorys).length / 2; key++) {
      await expect(
        getAvailableVersions({ repositorys: [key] })
      ).resolves.toStrictEqual([])

      expect(axiosClient.get).toBeCalledWith(
        expect.stringContaining('https://api.github.com/repos/')
      )
      expect(logError).toBeCalledWith(
        Error(
          'Could not fetch available releases from https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases with error:\n ' +
            'Could not fetch tag 404'
        ),
        'WineDownloader'
      )
    }
  })
})
