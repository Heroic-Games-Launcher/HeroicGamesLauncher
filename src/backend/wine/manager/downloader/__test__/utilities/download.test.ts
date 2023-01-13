import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { downloadFile } from '../../utilities'

const workDir = process.cwd()

describe('Utilities - Download', () => {
  test('download file fails because of invalid installDir', async () => {
    const progress = jest.fn()
    await downloadFile({
      url: '',
      downloadDir: 'invalid',
      downsize: 100000,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error).toBe('Download path invalid does not exist!')
      })
  })

  test('download file fails because of installDir is a file', async () => {
    const progress = jest.fn()
    await downloadFile({
      url: '',
      downloadDir: __filename,
      downsize: 100000,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error).toBe(
          `Download path ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/download.test.ts is not a directory!`
        )
      })
  })

  test('download file can be aborted', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_download'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const abortController = new AbortController()

    setTimeout(() => {
      abortController.abort()
    }, 10)

    await downloadFile({
      url: `file:///${__dirname}/../test_data/test.tar.xz`,
      downloadDir: installDir,
      downsize: 100000,
      onProgress: progress,
      abortSignal: abortController.signal
    })
      .then(() => {
        failed = true
      })
      .catch((error) => {
        expect(error).toBe('AbortError')
      })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    if (failed) {
      throw Error('No error should be thrown!')
    }
  })

  test('download file succeed', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_download'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await downloadFile({
      url: `file:///${__dirname}/../test_data/test.tar.xz`,
      downloadDir: installDir,
      downsize: 100000,
      onProgress: progress
    })
      .then((response) => {
        expect(response).toBe(
          `Succesfully downloaded file:///${workDir}/src/backend/wine/manager/downloader/__test__/utilities/../test_data/test.tar.xz to ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/test_download/test.tar.xz.`
        )
      })
      .catch(() => {
        failed = true
      })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    if (failed) {
      throw Error('No error should be thrown!')
    }

    expect(progress).toBeCalledWith('downloading', {
      percentage: 0,
      avgSpeed: 0,
      eta: 1
    })
    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).toBeCalledWith('idle')
  })
})
