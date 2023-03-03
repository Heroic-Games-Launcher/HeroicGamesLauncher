import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { unzipFile } from '../../utilities'

jest.mock('backend/logger/logger')
jest.mock('backend/logger/logfile')

const workDir = process.cwd()

describe('Utilities - Unzip', () => {
  test('unzip file fails because of invalid archive path', async () => {
    const progress = jest.fn()
    await expect(
      unzipFile({
        filePath: 'invalid.tar.xz',
        unzipDir: __dirname,
        onProgress: progress
      })
    ).rejects.toStrictEqual('Zip file invalid.tar.xz does not exist!')
  })

  test('unzip file fails because of archive is not a file', async () => {
    const progress = jest.fn()
    await expect(
      unzipFile({
        filePath: __dirname,
        unzipDir: __dirname,
        onProgress: progress
      })
    ).rejects.toStrictEqual(
      `Archive path ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities is not a file!`
    )
  })

  test('unzip file fails because of invalid install path', async () => {
    const progress = jest.fn()
    await expect(
      unzipFile({
        filePath: `${__dirname}/../test_data/test.tar.xz`,
        unzipDir: 'invalid',
        onProgress: progress
      })
    ).rejects.toStrictEqual('Install path invalid does not exist!')
  })

  test('unzip file can be aborted', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const abortController = new AbortController()

    setTimeout(() => {
      abortController.abort()
    }, 10)

    await expect(
      unzipFile({
        filePath: `${__dirname}/../test_data/test.tar.xz`,
        unzipDir: installDir,
        onProgress: progress,
        abortSignal: abortController.signal
      })
    ).rejects.toStrictEqual('AbortError')

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }
  })

  test('unzip tar.xz file succeesfully', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await expect(
      unzipFile({
        filePath: `${__dirname}/../test_data/test.tar.xz`,
        unzipDir: installDir,
        onProgress: progress
      })
    ).resolves.toStrictEqual(
      `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/../test_data/test.tar.xz to ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/test_unzip.`
    )

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }
  })

  test('unzip tar.gz file succeesfully', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await expect(
      unzipFile({
        filePath: `${__dirname}/../test_data/test.tar.gz`,
        unzipDir: installDir,
        onProgress: progress
      })
    ).resolves.toStrictEqual(
      `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/../test_data/test.tar.gz to ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/test_unzip.`
    )

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }
  })

  test('unzip tar.gz file twice to the same direction succeesfully', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await expect(
      unzipFile({
        filePath: `${__dirname}/../test_data/test.tar.gz`,
        unzipDir: installDir,
        onProgress: progress
      })
    ).resolves.toStrictEqual(
      `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/../test_data/test.tar.gz to ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/test_unzip.`
    )

    await expect(
      unzipFile({
        filePath: `${__dirname}/../test_data/test.tar.gz`,
        unzipDir: installDir,
        overwrite: true,
        onProgress: progress
      })
    ).resolves.toStrictEqual(
      `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/../test_data/test.tar.gz to ${workDir}/src/backend/wine/manager/downloader/__tests__/utilities/test_unzip.`
    )

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(progress).toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })
})
