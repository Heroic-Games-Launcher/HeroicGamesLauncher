import { join } from 'path'
import { readFileSync } from 'graceful-fs'
import graceful_fs from 'graceful-fs'
import { axiosClient } from 'backend/utils'
import { getAssetDataFromDownload, downloadFile } from '../../util'
import { test_data } from './test_data/github-api-heroic-test-data.json'
import { describeSkipOnWindows } from 'backend/__tests__/skip'

jest.mock('backend/logger')

const testUrl =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/download/v2.3.9/Heroic-2.3.9.AppImage'
const testTarFilePath = join(__dirname, 'test_data/TestArchive.tar.xz')

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

describeSkipOnWindows('downloadFile', () => {
  it('Success', async () => {
    const expectedData = readFileSync(testTarFilePath)

    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      status: 200,
      data: expectedData
    })
    jest
      .spyOn(graceful_fs, 'writeFile')
      .mockImplementation(
        (
          path: any,
          data: any,
          callback: (err: NodeJS.ErrnoException | null) => void
        ) => {
          callback(null)
        }
      )

    const tmpFileName = '/tmp/someFile'
    await expect(downloadFile(testUrl, tmpFileName)).resolves.toBeUndefined()
    expect(graceful_fs.writeFile).toBeCalledWith(
      tmpFileName,
      expectedData,
      expect.anything()
    )
  })

  it('Axios error', async () => {
    expect.assertions(1)

    jest.spyOn(axiosClient, 'get').mockRejectedValue({
      toJSON: () => '{ "message": "Some error message" }'
    })

    await expect(downloadFile(testUrl, '')).rejects.toEqual(
      Error(
        `Failed to download ${testUrl}: { "message": "Some error message" }`
      )
    )
  })

  it('HTTP error', async () => {
    expect.assertions(1)

    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      status: 404,
      data: {}
    })
    await expect(downloadFile(testUrl, '')).rejects.toEqual(
      Error(`Failed to download ${testUrl}: HTTP error code 404`)
    )
  })

  it('writeFile error', async () => {
    const expectedData = readFileSync(
      join(__dirname, 'test_data/TestArchive.tar.xz')
    )

    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      status: 200,
      data: expectedData
    })

    jest.spyOn(graceful_fs, 'writeFile').mockImplementation((fn, data, cb) => {
      cb({ stack: 'Mocked error stack' } as Error)
    })

    await expect(downloadFile(testUrl, '')).rejects.toEqual(
      Error('Failed to save downloaded data to file: Mocked error stack')
    )
  })
})
