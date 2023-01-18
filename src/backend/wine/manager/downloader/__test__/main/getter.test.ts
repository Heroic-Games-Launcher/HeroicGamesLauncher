import { Repositorys, VersionInfo } from 'common/types'
import { getAvailableVersions } from '../../main'
import { test_data_release_list } from '../test_data/github-api-test-data.json'
import * as axios from 'axios'

describe('Main - GetAvailableVersions', () => {
  test('fetch releases succesfully', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release_list)

    await getAvailableVersions({})
      .then((releases: VersionInfo[]) => {
        expect(releases).not.toBe([])
        expect(releases.length).toBeGreaterThan(0)
        expect(releases[2].version).toContain('6.16-GE-1')
      })
      .catch(() => {
        throw Error('No error should be thrown!')
      })

    expect(axios.default.get).toBeCalledWith(
      'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
    )
  })

  test('fetch releases succesfully independent', async () => {
    axios.default.get = jest.fn().mockResolvedValue(test_data_release_list)

    for (let key = 0; key < Object.keys(Repositorys).length / 2; key++) {
      await getAvailableVersions({
        repositorys: [key]
      })
        .then((releases: VersionInfo[]) => {
          expect(releases).not.toBe([])
          expect(releases.length).toBeGreaterThan(0)
          expect(releases[2].version).toContain('6.16-GE-1')
        })
        .catch(() => {
          throw Error('No error should be thrown!')
        })

      expect(axios.default.get).toBeCalledWith(
        'https://api.github.com/repos/GloriousEggroll/wine-ge-custom/releases?per_page=100'
      )
    }
  })

  test('fetch releases failed because of 404', async () => {
    axios.default.get = jest.fn().mockRejectedValue('Could not fetch tag 404')

    for (let key = 0; key < Object.keys(Repositorys).length / 2; key++) {
      await getAvailableVersions({ repositorys: [key] })
        .then(() => {
          throw Error("Function shouldn't success!")
        })
        .catch((error: Error) => {
          expect(error.message).toContain('Could not fetch tag 404')
        })

      expect(axios.default.get).toBeCalledWith(
        expect.stringContaining('https://api.github.com/repos/')
      )
    }
  })

  test('Invalid repository key returns nothing', async () => {
    axios.default.get = jest.fn()
    console.warn = jest.fn()

    await getAvailableVersions({ repositorys: [-1] })
      .then((releases: VersionInfo[]) => {
        expect(releases).toStrictEqual([])
        expect(releases.length).toBe(0)
      })
      .catch(() => {
        throw Error('No error should be thrown!')
      })

    expect(axios.default.get).not.toBeCalled()
    expect(console.warn).toBeCalledWith(
      'Unknown and not supported repository key passed! Skip fetch for -1'
    )
  })
})
