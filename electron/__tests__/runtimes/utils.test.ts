import { join } from 'path'
import { readFileSync, writeFile } from 'graceful-fs'
import graceful_fs from 'graceful-fs'
import axios from 'axios'
import {
  getAssetDataFromDownload,
  downloadFile
} from '../../wine/runtimes/util'
// @ts-ignore: Don't know why ts complains about it.
import { test_data } from './test_data/github-api-heroic-test-data.json'
import { fileSync } from 'tmp'

const testUrl =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/download/v2.3.9/Heroic-2.3.9.AppImage'

afterEach(jest.restoreAllMocks)

describe('getAssetDataFromDownload', () => {
  it('Success', async () => {
    // https://stackoverflow.com/a/43047378
    jest.spyOn(axios, 'get').mockResolvedValue(test_data)

    await expect(getAssetDataFromDownload(testUrl)).resolves.toMatchObject({
      name: 'Heroic-2.3.9.AppImage',
      url: 'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/assets/68579064'
    })
    expect(axios.get).toBeCalledWith(
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

    jest.spyOn(axios, 'get').mockResolvedValue({ data: {}, status: 200 })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Asset metadata could not be found')
    )
  })

  it('HTTP error code', async () => {
    expect.assertions(1)

    jest.spyOn(axios, 'get').mockResolvedValue({ data: {}, status: 404 })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Got HTTP error code 404')
    )
  })

  // https://axios-http.com/docs/handling_errors
  it('Axios error', async () => {
    expect.assertions(1)

    jest.spyOn(axios, 'get').mockRejectedValue({
      toJSON: () => '{ "message": "Some error message" }'
    })
    await expect(getAssetDataFromDownload(testUrl)).rejects.toEqual(
      Error('Failed to access GitHub API: { "message": "Some error message" }')
    )
  })
})

describe('downloadFile', () => {
  it('Success', async () => {
    const expectedData = readFileSync(
      join(__dirname, 'test_data/TestArchive.tar.xz')
    )

    jest.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: expectedData
    })

    const tmpfile = fileSync()
    await expect(downloadFile(testUrl, tmpfile.name)).resolves.toBeUndefined()
    expect(readFileSync(tmpfile.fd)).toEqual(expectedData)
  })

  it('Axios error', async () => {
    expect.assertions(1)

    jest.spyOn(axios, 'get').mockRejectedValue({
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

    jest.spyOn(axios, 'get').mockResolvedValue({
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

    jest.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: expectedData
    })

    jest.spyOn(graceful_fs, 'writeFile').mockImplementation((fn, data, cb) => {
      cb({ stack: 'Mocked error stack' } as Error)
    })

    expect(downloadFile(testUrl, '')).rejects.toEqual(
      Error('Failed to save downloaded data to file: Mocked error stack')
    )
  })
})
