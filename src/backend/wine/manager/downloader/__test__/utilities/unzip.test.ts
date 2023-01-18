import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { unzipFile } from '../../utilities'

const workDir = process.cwd()

describe('Utilities - Unzip', () => {
  test('unzip file fails because of invalid archive path', async () => {
    const progress = jest.fn()
    await unzipFile({
      filePath: 'invalid.tar.xz',
      unzipDir: __dirname,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error).toBe('Zip file invalid.tar.xz does not exist!')
      })
  })

  test('unzip file fails because of archive is not a file', async () => {
    const progress = jest.fn()
    await unzipFile({
      filePath: __dirname,
      unzipDir: __dirname,
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error).toBe(
          `Archive path ${workDir}/src/backend/wine/manager/downloader/__test__/utilities is not a file!`
        )
      })
  })

  test('unzip file fails because of invalid install path', async () => {
    const progress = jest.fn()
    await unzipFile({
      filePath: `${__dirname}/../test_data/test.tar.xz`,
      unzipDir: 'invalid',
      onProgress: progress
    })
      .then(() => {
        throw Error('No error should be thrown!')
      })
      .catch((error) => {
        expect(error).toBe('Install path invalid does not exist!')
      })
  })

  test('unzip file can be aborted', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const abortController = new AbortController()

    setTimeout(() => {
      abortController.abort()
    }, 10)

    await unzipFile({
      filePath: `${__dirname}/../test_data/test.tar.xz`,
      unzipDir: installDir,
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

  test('unzip tar.xz file succeesfully', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await unzipFile({
      filePath: `${__dirname}/../test_data/test.tar.xz`,
      unzipDir: installDir,
      onProgress: progress
    })
      .then((response) => {
        expect(response).toBe(
          `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/../test_data/test.tar.xz to ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/test_unzip.`
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
  })

  test('unzip tar.gz file succeesfully', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await unzipFile({
      filePath: `${__dirname}/../test_data/test.tar.gz`,
      unzipDir: installDir,
      onProgress: progress
    })
      .then((response) => {
        expect(response).toBe(
          `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/../test_data/test.tar.gz to ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/test_unzip.`
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
  })

  test('unzip tar.gz file twice to the same direction succeesfully', async () => {
    const progress = jest.fn()
    const installDir = __dirname + '/test_unzip'
    let failed = false

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    await unzipFile({
      filePath: `${__dirname}/../test_data/test.tar.gz`,
      unzipDir: installDir,
      onProgress: progress
    })
      .then((response) => {
        expect(response).toBe(
          `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/../test_data/test.tar.gz to ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/test_unzip.`
        )
      })
      .catch(() => {
        failed = true
      })

    await unzipFile({
      filePath: `${__dirname}/../test_data/test.tar.gz`,
      unzipDir: installDir,
      overwrite: true,
      onProgress: progress
    })
      .then((response) => {
        expect(response).toBe(
          `Succesfully unzip ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/../test_data/test.tar.gz to ${workDir}/src/backend/wine/manager/downloader/__test__/utilities/test_unzip.`
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

    expect(progress).toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })
})
