import * as logfile from '../logfile'
import { TypeCheckedStoreBackend } from '../../electron_store'

import { dirSync } from 'tmp'
import { join } from 'path'
import { writeFileSync } from 'fs'
import {
  deleteUploadedLogFile,
  getUploadedLogFiles,
  uploadLogFile
} from '../uploader'

jest.mock('electron-store')
jest.mock('../logfile')

describe('logger/uploader', () => {
  let fetchSpy: jest.SpyInstance<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >
  const fixedTime = new Date()
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(fixedTime)
    fetchSpy = jest.spyOn(global, 'fetch')
  })
  beforeEach(() => {
    fetchSpy.mockReset()
  })
  afterAll(() => {
    jest.useRealTimers()
  })

  const uploadedLogFileStore = new TypeCheckedStoreBackend('uploadedLogs', {
    cwd: 'store',
    name: 'uploadedLogs',
    accessPropertiesByDotNotation: false
  })

  describe('uploadLogFile', () => {
    const tmpDir = dirSync({ unsafeCleanup: true })
    const testLogPath = join(tmpDir.name, 'test.txt')
    writeFileSync(testLogPath, 'Test log content')

    test('Works normally', async () => {
      fetchSpy.mockImplementationOnce(
        async () =>
          new Response('https://0x0.st/test\n', {
            status: 200,
            headers: {
              'X-Token': 'test-token'
            }
          })
      )

      const getLogFileMock = jest
        .spyOn(logfile, 'getLogFile')
        .mockImplementationOnce((appNameOrRunner) =>
          join(tmpDir.name, appNameOrRunner + '.txt')
        )

      await expect(
        uploadLogFile('Test log file', 'test')
      ).resolves.toMatchObject([
        'https://0x0.st/test',
        {
          name: 'Test log file',
          token: 'test-token',
          uploadedAt: fixedTime.valueOf()
        }
      ])
      expect(fetchSpy).toBeCalledTimes(1)
      const expectedFormData = new FormData()
      expectedFormData.set('file', new Blob(['Test log content']), 'test.txt')
      expectedFormData.set('expires', '24')
      expect(fetchSpy).toBeCalledWith('https://0x0.st', {
        body: expectedFormData,
        method: 'post',
        headers: { 'User-Agent': 'HeroicGamesLauncher/1.0.0' }
      })
      expect(getLogFileMock).toBeCalledWith('test')
    })

    test('fetch fails', async () => {
      fetchSpy.mockImplementation(async () => {
        throw new Error()
      })

      jest
        .spyOn(logfile, 'getLogFile')
        .mockImplementationOnce((appNameOrRunner) =>
          join(tmpDir.name, appNameOrRunner + '.txt')
        )

      await expect(uploadLogFile('Test log file', 'test')).resolves.toBe(false)
      expect(fetchSpy).toBeCalledTimes(1)
    })
  })

  describe('deleteUploadedLogFile', () => {
    test('Works normally', async () => {
      uploadedLogFileStore.set('https://0x0.st/test' as string, {
        token: 'test-token',
        name: 'Test Name',
        uploadedAt: fixedTime.valueOf()
      })

      fetchSpy.mockImplementation(
        async () => new Response(null, { status: 200 })
      )

      await expect(deleteUploadedLogFile('https://0x0.st/test')).resolves.toBe(
        true
      )
      expect(fetchSpy).toBeCalledTimes(1)

      const expectedFormData = new FormData()
      expectedFormData.set('token', 'test-token')
      expectedFormData.set('delete', '')
      expect(fetchSpy).toBeCalledWith('https://0x0.st/test', {
        body: expectedFormData,
        method: 'post',
        headers: { 'User-Agent': 'HeroicGamesLauncher/1.0.0' }
      })

      expect(uploadedLogFileStore.raw_store).toMatchObject({})
    })

    test('fetch fails', async () => {
      uploadedLogFileStore.set('https://0x0.st/test' as string, {
        token: 'test-token',
        name: 'Test Name',
        uploadedAt: fixedTime.valueOf()
      })

      fetchSpy.mockImplementation(async () => {
        throw new Error()
      })
      await expect(deleteUploadedLogFile('https://0x0.st/test')).resolves.toBe(
        false
      )
      expect(uploadedLogFileStore.raw_store).toMatchObject({
        'https://0x0.st/test': {
          token: 'test-token',
          name: 'Test Name',
          uploadedAt: fixedTime.valueOf()
        }
      })
    })
  })

  describe('getUploadedLogFiles', () => {
    test('Works normally', async () => {
      uploadedLogFileStore.set('https://0x0.st/test' as string, {
        token: 'test-token',
        name: 'Test Name',
        uploadedAt: fixedTime.valueOf()
      })
      await expect(getUploadedLogFiles()).resolves.toMatchObject({
        'https://0x0.st/test': {
          token: 'test-token',
          name: 'Test Name',
          uploadedAt: fixedTime.valueOf()
        }
      })
    })

    test('Old logs get deleted', async () => {
      uploadedLogFileStore.set('https://0x0.st/test' as string, {
        token: 'test-token',
        name: 'Test Name',
        uploadedAt: new Date(fixedTime).setDate(fixedTime.getDate() - 1)
      })
      await expect(getUploadedLogFiles()).resolves.toMatchObject({})
      expect(uploadedLogFileStore.raw_store).toMatchObject({})
    })
  })
})
