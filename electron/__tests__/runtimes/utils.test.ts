import axios from 'axios'
import { getAssetDataFromDownload } from '../../wine/runtimes/util'
// @ts-ignore: Don't know why ts complains about it.
import { test_data } from './test_data/github-api-lutris-test-data.json'

describe('Runtimes-utils', () => {
  test('getAssetDataFromDownload - success', async () => {
    axios.get = jest.fn().mockResolvedValue(test_data)

    await getAssetDataFromDownload(
      'https://github.com/lutris/buildbot/releases/download/2021.11.20/eac_runtime.tar.xz'
    ).then((response) => {
      expect(response.name).toBe('eac_runtime.tar.xz')
      expect(response.url).toBe(
        'https://api.github.com/repos/lutris/buildbot/releases/assets/59731419'
      )
      expect(axios.get).toBeCalledWith(
        'https://api.github.com/repos/lutris/buildbot/releases/tags/2021.11.20'
      )
    })
  })

  it('getAssetDataFromDownload - catch invalid URL/responses', async () => {
    expect.assertions(3)

    // Empty URL
    expect(getAssetDataFromDownload('')).rejects.toEqual(
      Error('Asset metadata could not be found')
    )

    // No data
    axios.get = jest.fn().mockResolvedValue({})
    expect(
      getAssetDataFromDownload(
        'https://github.com/lutris/buildbot/releases/download/2021.11.20/eac_runtime.tar.xz'
      )
    ).rejects.toEqual(Error('Asset metadata could not be found'))

    // Empty data
    axios.get = jest.fn().mockResolvedValue({ data: {} })
    expect(
      getAssetDataFromDownload(
        'https://github.com/lutris/buildbot/releases/download/2021.11.20/eac_runtime.tar.xz'
      )
    ).rejects.toEqual(Error('Asset metadata could not be found'))
  })
})
