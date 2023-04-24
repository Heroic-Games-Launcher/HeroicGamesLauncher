import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  copyFileSync
} from 'graceful-fs'
import { installVersion } from '../../main'
import { VersionInfo } from 'common/types'
import * as axios from 'axios'
import * as crypto from 'crypto'
import { clearInterval } from 'timers'
import { logWarning, logError } from 'backend/logger/logger'

jest.mock('backend/logger/logger')
jest.mock('backend/logger/logfile')

const workDir = process.cwd()

describe('Main - InstallVersion', () => {
  test('install fails because installDir does not exist', async () => {
    const progress = jest.fn()

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: '',
      downsize: 100,
      disksize: 0,
      checksum: ''
    }

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: 'invalid',
        onProgress: progress
      })
    ).rejects.toStrictEqual(
      Error('Installation directory invalid does not exist!')
    )
  })

  test('install fails because installDir is not a directory', async () => {
    const progress = jest.fn()

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: '',
      downsize: 100,
      disksize: 0,
      checksum: ''
    }

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: __filename,
        onProgress: progress
      })
    ).rejects.toStrictEqual(
      Error(
        `Installation directory ${workDir}/src/backend/wine/manager/downloader/__tests__/main/install.test.ts is not a directory!`
      )
    )
  })

  test('install fails because no download link provided', async () => {
    const progress = jest.fn()

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: '',
      downsize: 100,
      disksize: 0,
      checksum: ''
    }
    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: __dirname,
        onProgress: progress
      })
    ).rejects.toStrictEqual(Error('No download link provided for 1.2.3!'))
  })

  test('install fails because of checksum missmatch', async () => {
    const checksum = 'invalid_checksum'

    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${__dirname}/../test_data/test.tar.gz`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress
      })
    ).rejects.toStrictEqual(Error('Checksum verification failed'))

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).not.toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })

  test('install warns because no checksum provided', async () => {
    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn()
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: '1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${__dirname}/../test_data/test.tar.gz`,
      downsize: 100,
      disksize: 0,
      checksum: ''
    }

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress
      })
    ).resolves.toStrictEqual({
      installDir: installDir + '/1.2.3',
      versionInfo: releaseVersion
    })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(axios.default.get).not.toBeCalledWith()

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
    expect(logError).not.toBeCalled()
    expect(logWarning).toBeCalledWith(
      'No checksum provided. Download of 1.2.3 could be invalid!',
      'WineDownloader'
    )
  })

  test('install succeed because already exist', async () => {
    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn().mockReturnValue({ data: '' })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(`${installDir}/Wine-1.2.3`, { recursive: true })
    }

    const releaseVersion: VersionInfo = {
      version: 'Wine-1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${__dirname}/../test_data/test.tar.gz`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress
      })
    ).resolves.toStrictEqual({
      installDir: installDir + '/Wine-1.2.3',
      versionInfo: releaseVersion
    })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })
  })

  test('install can be aborted during download', async () => {
    const fileLink = `${__dirname}/../test_data/test.tar.gz`
    const fileBuffer = readFileSync(fileLink)
    const hashSum = crypto.createHash('sha512')
    hashSum.update(fileBuffer)
    const checksum = hashSum.digest('hex')

    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: 'Wine-1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${fileLink}`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }

    const abortController = new AbortController()

    const interval = setInterval(() => {
      if (
        progress.mock.calls.find((call) => {
          return call[0] === 'downloading'
        })
      ) {
        abortController.abort()
        clearInterval(interval)
      }
    }, 1)

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress,
        abortSignal: abortController.signal
      })
    ).rejects.toStrictEqual(Error('Installation of Wine-1.2.3 was aborted!'))

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    clearInterval(interval)

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })
  })

  test('install can be aborted during unzip', async () => {
    const fileLink = `${__dirname}/../test_data/test.tar.gz`
    const fileBuffer = readFileSync(fileLink)
    const hashSum = crypto.createHash('sha512')
    hashSum.update(fileBuffer)
    const checksum = hashSum.digest('hex')

    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: 'Wine-1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${fileLink}`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }

    const abortController = new AbortController()

    const interval = setInterval(() => {
      if (
        progress.mock.calls.find((call) => {
          return call[0] === 'unzipping'
        })
      ) {
        abortController.abort()
        clearInterval(interval)
      }
    }, 1)

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress,
        abortSignal: abortController.signal
      })
    ).rejects.toStrictEqual(Error('Installation of Wine-1.2.3 was aborted!'))

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    clearInterval(interval)

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })
  })

  test('install succeed', async () => {
    const fileLink = `${__dirname}/../test_data/test.tar.gz`
    const fileBuffer = readFileSync(fileLink)
    const hashSum = crypto.createHash('sha512')
    hashSum.update(fileBuffer)
    const checksum = hashSum.digest('hex')

    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: 'Wine-1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${fileLink}`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }

    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress
      })
    ).resolves.toStrictEqual({
      installDir: installDir + '/Wine-1.2.3',
      versionInfo: releaseVersion
    })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })

  test('install succeed if tar file still exists in install dir', async () => {
    const fileLink = `${__dirname}/../test_data/test.tar.gz`
    const fileBuffer = readFileSync(fileLink)
    const hashSum = crypto.createHash('sha512')
    hashSum.update(fileBuffer)
    const checksum = hashSum.digest('hex')

    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const destFileLink = `${installDir}/${fileLink.split('/').slice(-1)[0]}`
    if (!existsSync(destFileLink)) {
      copyFileSync(fileLink, destFileLink)
    }

    const releaseVersion: VersionInfo = {
      version: 'Wine-1.2.3',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${fileLink}`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }
    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress
      })
    ).resolves.toStrictEqual({
      installDir: installDir + '/Wine-1.2.3',
      versionInfo: releaseVersion
    })

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })

  test('install fails if subfolder can not be created', async () => {
    const fileLink = `${__dirname}/../test_data/test.tar.gz`
    const fileBuffer = readFileSync(fileLink)
    const hashSum = crypto.createHash('sha512')
    hashSum.update(fileBuffer)
    const checksum = hashSum.digest('hex')

    const installDir = __dirname + '/test_install'
    axios.default.get = jest.fn().mockReturnValue({ data: checksum })
    const progress = jest.fn()

    if (!existsSync(installDir)) {
      mkdirSync(installDir)
    }

    const releaseVersion: VersionInfo = {
      version: 'Wine-1.2.3/invalid',
      type: 'Wine-GE',
      date: '12/24/2021',
      download: `file:///${fileLink}`,
      downsize: 100,
      disksize: 0,
      checksum: '<to-checksum-file>'
    }
    await expect(
      installVersion({
        versionInfo: releaseVersion,
        installDir: installDir,
        onProgress: progress
      })
    ).rejects.toStrictEqual(
      Error(
        `Failed to make folder ${installDir}/Wine-1.2.3/invalid with:\n ` +
          Error(
            `ENOENT: no such file or directory, mkdir '${installDir}/Wine-1.2.3/invalid'`
          )
      )
    )

    if (existsSync(installDir)) {
      rmSync(installDir, { recursive: true })
    }

    expect(axios.default.get).toBeCalledWith('<to-checksum-file>', {
      responseType: 'text'
    })

    expect(progress).toBeCalledWith('downloading', {
      percentage: expect.any(Number),
      avgSpeed: expect.any(Number),
      eta: expect.any(Number)
    })
    expect(progress).not.toBeCalledWith('unzipping')
    expect(progress).toBeCalledWith('idle')
  })
})
