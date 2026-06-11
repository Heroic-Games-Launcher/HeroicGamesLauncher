import { axiosClient } from 'backend/utils'
import { getAssetDataFromDownload } from '../../util'
import { test_data } from './test_data/github-api-heroic-test-data.json'
import { describeSkipOnWindows } from 'backend/__tests__/skip'

jest.mock('backend/logger')

const testUrl =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/download/v2.3.9/Heroic-2.3.9.AppImage'

afterEach(jest.restoreAllMocks)

describeSkipOnWindows('getAssetDataFromDownload', () => {
  it('Success', async () => {
    // https://stackoverflow.com/a/43047378
    jest.spyOn(axiosClient, 'get').mockResolvedValue(test_data)

    await expect(getAssetDataFromDownload(testUrl)).resolves.toMatchObject({
      name: 'Heroic-2.3.9.AppImage',
      url: 'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/assets/68579064'
    })
    expect(axiosClient.get).toBeCalledWith(
      'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/tags/v2.3.9'
    )
  })

  it('Invalid URL', async () => {
    expect.assertions(1)

    await expect(getAssetDataFromDownload('')).rejects.toEqual(
      Error('Invalid URL provided')
    )
  })

  it('Empty data', async () => {
    expect.assertions(1)

    jest.spyOn(axiosClient, 'get').mockResolvedValue({ data: {}, status: 200 })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Asset metadata could not be found')
    )
  })

  it('HTTP error code', async () => {
    expect.assertions(1)

    jest.spyOn(axiosClient, 'get').mockResolvedValue({ data: {}, status: 404 })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Got HTTP error code 404')
    )
  })

  // https://axios-http.com/docs/handling_errors
  it('Axios error', async () => {
    expect.assertions(1)

    jest.spyOn(axiosClient, 'get').mockRejectedValue({
      toJSON: () => '{ "message": "Some error message" }'
    })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Failed to access GitHub API: { "message": "Some error message" }')
    )
  })
})

