import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { downloadFile } from '../../utilities'

jest.mock('backend/logger/logger')
jest.mock('backend/logger/logfile')

const workDir = process.cwd()

describe('Utilities - Download', () => {
  test('download file fails because of invalid installDir', async () => {
    const progress = jest.fn()
    await expect(
      downloadFile({
        url: '',
        downloadDir: 'invalid',
        downsize: 100000,
        onProgress: progress
      })
    ).rejects.toStrictEqual('Download path invalid does not exist!')
  })

  test('download file fails because of installDir is a file', async () => {
    const progress = jest.fn()
    await expect(
      downloadFile({
        url: '',
        downloadDir: __filename,
        downsize: 100000,
        onProgress: progress
      })
    ).rejects.toMatchInlineSnapshot(
      `"Download path /home/niklas/Repository/HeroicGamesLauncher/src/backend/wine/manager/downloader/__tests__/utilities/download.test.ts is not a directory!"`
    )
  })

  test('download file can be aborted', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_download'

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const abortController = new AbortController()

    setTimeout(() => {
      abortController.abort()
    }, 10)

    await expect(
      downloadFile({
        url: `file:///${__dirname}/../test_data/test.tar.xz`,
        downloadDir: installDir,
        downsize: 100000,
        onProgress: progress,
        abortSignal: abortController.signal
      })
    ).rejects.toStrictEqual('AbortError')

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }
  })

  test('download file succeed', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_download'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await expect(
      downloadFile({
        url: `file:///${__dirname}/../test_data/test.tar.xz`,
        downloadDir: installDir,
        downsize: 100000,
        onProgress: progress
      })
    ).resolves.toMatchInlineSnapshot(
      `"Succesfully downloaded file:////home/niklas/Repository/HeroicGamesLauncher/src/backend/wine/manager/downloader/__tests__/utilities/../test_data/test.tar.xz to /home/niklas/Repository/HeroicGamesLauncher/src/backend/wine/manager/downloader/__tests__/utilities/test_download/test.tar.xz."`
    )

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
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
