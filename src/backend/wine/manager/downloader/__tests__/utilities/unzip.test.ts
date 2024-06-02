import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { unzipFile } from '../../utilities'

jest.mock('backend/logger/logger')
jest.mock('backend/logger/logfile')
jest.mock('@xhmikosr/decompress', () => {
  return jest.fn().mockImplementation(async () => Promise.resolve())
})

jest.mock('@xhmikosr/decompress-targz', () => {
  return jest.fn().mockImplementation(() => {})
})

jest.mock('@felipecrs/decompress-tarxz', () => {
  return jest.fn().mockImplementation(() => {})
})

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
    ).rejects.toStrictEqual(`Archive path ${__dirname} is not a file!`)
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
      `Succesfully unzip ${__dirname}/../test_data/test.tar.xz to ${installDir}.`
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
      `Succesfully unzip ${__dirname}/../test_data/test.tar.gz to ${installDir}.`
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
      `Succesfully unzip ${__dirname}/../test_data/test.tar.gz to ${installDir}.`
    )

    await expect(
      unzipFile({
        filePath: `${__dirname}/../test_data/test.tar.gz`,
        unzipDir: installDir,
        overwrite: true,
        onProgress: progress
      })
    ).resolves.toStrictEqual(
      `Succesfully unzip ${__dirname}/../test_data/test.tar.gz to ${installDir}.`
    )

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(progress).toBeCalledWith({ status: 'unzipping' })
    expect(progress).toBeCalledWith({ status: 'idle' })
  })
})
