import { Repositorys, VersionInfo } from 'common/types'
import { getAvailableVersions } from '../../main'
import { test_data_release_list } from '../test_data/github-api-test-data.json'
import { axiosClient } from 'backend/utils'
import { logError } from 'backend/logger'

jest.mock('backend/logger')

const originalArch = Object.getOwnPropertyDescriptor(process, 'arch')!
const repositories = Object.values(Repositorys).filter(
  (value): value is Repositorys => typeof value === 'number'
)
beforeAll(() => Object.defineProperty(process, 'arch', { value: 'x64' }))
afterAll(() => Object.defineProperty(process, 'arch', originalArch))

describe('Main - GetAvailableVersions', () => {
  test('fetch releases succesfully', async () => {
    axiosClient.get = jest.fn().mockResolvedValue(test_data_release_list)

    await getAvailableVersions({}).then((releases: VersionInfo[]) => {
      expect(releases).not.toBe([])
      expect(releases.length).toBeGreaterThan(0)
      expect(releases[3].version).toContain('6.16-GE-1')
    })

    expect(axiosClient.get).toBeCalledWith(
      'https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page=100'
    )
    expect(logError).not.toBeCalled()
  })

  test('fetch releases succesfully independent', async () => {
    axiosClient.get = jest.fn().mockResolvedValue(test_data_release_list)

    for (const key of repositories) {
      await getAvailableVersions({
        repositorys: [key]
      }).then((releases: VersionInfo[]) => {
        if (key === Repositorys.WINESTAGINGMACOS) {
          // This fixture has no staging archive for this provider.
          expect(releases).toEqual([])
          return
        }
        expect(releases).not.toBe([])
        expect(releases.length).toBeGreaterThan(0)
        expect(releases[3].version).toContain('6.16-GE-1')
      })

      expect(axiosClient.get).toBeCalledWith(
        'https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases?per_page=100'
      )
      expect(logError).not.toBeCalled()
    }
  })

  test('fetch releases failed because of 404', async () => {
    axiosClient.get = jest.fn().mockRejectedValue('Could not fetch tag 404')

    for (const key of repositories) {
      await expect(
        getAvailableVersions({ repositorys: [key] })
      ).resolves.toStrictEqual([])

      expect(axiosClient.get).toBeCalledWith(
        expect.stringContaining('https://api.github.com/repos/')
      )
      expect(logError).toBeCalledWith(
        Error(
          'Could not fetch available releases from https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases with error:\n ' +
            'Could not fetch tag 404'
        ),
        'WineDownloader'
      )
    }
  })
})
