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

  test('getAssetDataFromDownload - catch asset metadata does not exist', async () => {
    // empty url
    await getAssetDataFromDownload('')
      .then(() => {
        throw Error("Function shouldn't success!")
      })
      .catch((error: Error) => {
        expect(error.message).toBe('Asset metadata could not be found')
      })

    // no data entry
    axios.get = jest.fn().mockResolvedValue({ noData: {} })
    await getAssetDataFromDownload(
      'https://github.com/lutris/buildbot/releases/download/2021.11.20/eac_runtime.tar.xz'
    )
      .then(() => {
        throw Error("Function shouldn't success!")
      })
      .catch((error: Error) => {
        expect(error.message).toBe('Asset metadata could not be found')
      })

    // empty data
    axios.get = jest.fn().mockResolvedValue({ data: {} })
    await getAssetDataFromDownload(
      'https://github.com/lutris/buildbot/releases/download/2021.11.20/eac_runtime.tar.xz'
    )
      .then(() => {
        throw Error("Function shouldn't success!")
      })
      .catch((error: Error) => {
        expect(error.message).toBe('Asset metadata could not be found')
      })
  })
})
