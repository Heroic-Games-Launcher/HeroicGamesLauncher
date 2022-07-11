import axios from 'axios'
import { getAssetDataFromDownload } from '../../wine/runtimes/util'
// @ts-ignore: Don't know why ts complains about it.
import { test_data } from './test_data/github-api-heroic-test-data.json'

const testUrl =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/download/v2.3.9/Heroic-2.3.9.AppImage'

describe('wine/runtimes/utils.ts', () => {
  it('getAssetDataFromDownload - success', async () => {
    axios.get = jest.fn().mockResolvedValue(test_data)

    await expect(getAssetDataFromDownload(testUrl)).resolves.toMatchObject({
      name: 'Heroic-2.3.9.AppImage',
      url: 'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/assets/68579064'
    })
    expect(axios.get).toBeCalledWith(
      'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/tags/v2.3.9'
    )
  })

  it('getAssetDataFromDownload - catch invalid URL/responses', async () => {
    expect.assertions(4)

    // Empty URL
    await expect(getAssetDataFromDownload('')).rejects.toEqual(
      Error('Invalid URL provided')
    )

    // Empty data
    axios.get = jest.fn().mockResolvedValue({ data: {}, status: 200 })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Asset metadata could not be found')
    )

    // HTTP error code
    axios.get = jest
      .fn()
      .mockResolvedValue({ data: { assets: [] }, status: 404 })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Got HTTP error code 404')
    )

    // Axios error
    // https://axios-http.com/docs/handling_errors
    axios.get = jest.fn().mockRejectedValue({
      toJSON: () => '{ "message": "Some error message" }'
    })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Failed to access GitHub API: { "message": "Some error message" }')
    )
  })
})
