import type { AxiosResponse } from 'axios'
import { ProductsEndpointData } from 'common/types/gog'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import GOGLibraryManager from '../library'
import { downloadFile } from '../../../utils'

jest.mock('electron')
jest.mock('../../../../backend/logger', () => ({
  logError: jest.fn(),
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Gog: 'Gog' }
}))
jest.mock('../../../utils', () => ({
  getGOGdlBin: jest.fn(),
  getFileSize: jest.fn(),
  axiosClient: { get: jest.fn(), head: jest.fn() },
  downloadFile: jest.fn()
}))
jest.mock('../../../ipc')
jest.mock('../../../launcher')
jest.mock('../../../online_monitor')
jest.mock('../user')
jest.mock('../electronStores')
jest.mock('../games')
jest.mock('../redist')
jest.mock('../e2eMock')
jest.mock('../../index', () => ({ libraryManagerMap: {} }))

const makeResponse = (
  bonusContent:
    | NonNullable<ProductsEndpointData['downloads']>['bonus_content']
    | undefined
) =>
  ({ data: { downloads: { bonus_content: bonusContent } } }) as AxiosResponse<
    ProductsEndpointData,
    unknown
  >

describe('GOG Extras', () => {
  const manager = new GOGLibraryManager()
  let destination: string

  beforeEach(() => {
    destination = mkdtempSync(join(tmpdir(), 'heroic-gog-extras-'))
  })

  afterEach(() => {
    jest.restoreAllMocks()
    rmSync(destination, { recursive: true, force: true })
  })

  it('returns downloadable product bonus files and excludes unsafe links', async () => {
    jest.spyOn(manager, 'getProductApi').mockResolvedValue(
      makeResponse([
        {
          id: 12,
          name: 'Manuals',
          type: 'manual',
          count: 2,
          total_size: 50,
          files: [
            {
              id: 'a',
              size: 25,
              downlink: 'https://cdn.gog.com/Manual%20One.pdf'
            },
            { id: 'b', size: 25, downlink: 'javascript:alert(1)' }
          ]
        }
      ])
    )

    await expect(manager.getExtras('123')).resolves.toEqual([
      {
        id: 12,
        name: 'Manuals',
        type: 'manual',
        total_size: 50,
        files: [{ id: '12:a', filename: 'Manual One.pdf', size: 25 }]
      }
    ])
  })

  it('distinguishes a failed request from a product with no extras', async () => {
    jest
      .spyOn(manager, 'getProductApi')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeResponse([]))
      .mockResolvedValueOnce(makeResponse(undefined))

    await expect(manager.getExtras('123')).resolves.toBeNull()
    await expect(manager.getExtras('123')).resolves.toEqual([])
    await expect(manager.getExtras('123')).resolves.toEqual([])
  })

  it('downloads multiple files without replacing existing files and continues after failures', async () => {
    jest.spyOn(manager, 'getProductApi').mockResolvedValue(
      makeResponse([
        {
          id: 12,
          name: 'Manuals',
          type: 'manual',
          count: 2,
          total_size: 50,
          files: [
            { id: 'a', size: 25, downlink: 'https://cdn.gog.com/manual.pdf' },
            { id: 'b', size: 25, downlink: 'https://cdn.gog.com/manual.pdf' }
          ]
        }
      ])
    )
    writeFileSync(join(destination, 'manual.pdf'), 'existing')
    jest
      .mocked(downloadFile)
      .mockImplementationOnce(({ dest }) => {
        writeFileSync(dest, 'partial download')
        return Promise.reject(new Error('network failure'))
      })
      .mockImplementationOnce(({ dest }) => {
        expect(existsSync(dest)).toBe(false)
        writeFileSync(dest, 'complete download')
        return Promise.resolve()
      })

    await expect(
      manager.downloadExtras('123', ['12:a', '12:b'], destination)
    ).resolves.toEqual({
      downloaded: ['manual (1).pdf'],
      failed: ['12:a']
    })
    expect(downloadFile).toHaveBeenNthCalledWith(1, {
      url: 'https://cdn.gog.com/manual.pdf',
      dest: join(destination, 'manual (1).pdf')
    })
    expect(readFileSync(join(destination, 'manual (1).pdf'), 'utf8')).toBe(
      'complete download'
    )
    expect(readFileSync(join(destination, 'manual.pdf'), 'utf8')).toBe(
      'existing'
    )
    expect(downloadFile).toHaveBeenNthCalledWith(2, {
      url: 'https://cdn.gog.com/manual.pdf',
      dest: join(destination, 'manual (1).pdf')
    })
  })

  it('retries a failed download using the original filename', async () => {
    jest.spyOn(manager, 'getProductApi').mockResolvedValue(
      makeResponse([
        {
          id: 12,
          name: 'Manuals',
          type: 'manual',
          count: 1,
          total_size: 25,
          files: [
            { id: 'a', size: 25, downlink: 'https://cdn.gog.com/manual.pdf' }
          ]
        }
      ])
    )
    jest
      .mocked(downloadFile)
      .mockImplementationOnce(({ dest }) => {
        writeFileSync(dest, 'partial download')
        return Promise.reject(new Error('network failure'))
      })
      .mockImplementationOnce(({ dest }) => {
        writeFileSync(dest, 'complete download')
        return Promise.resolve()
      })

    await expect(
      manager.downloadExtras('123', ['12:a'], destination)
    ).resolves.toEqual({ downloaded: [], failed: ['12:a'] })
    expect(existsSync(join(destination, 'manual.pdf'))).toBe(false)

    await expect(
      manager.downloadExtras('123', ['12:a'], destination)
    ).resolves.toEqual({ downloaded: ['manual.pdf'], failed: [] })
    expect(readFileSync(join(destination, 'manual.pdf'), 'utf8')).toBe(
      'complete download'
    )
    expect(existsSync(join(destination, 'manual (1).pdf'))).toBe(false)
  })

  it('rejects missing or non-directory download locations without downloading', async () => {
    const missing = await manager.downloadExtras(
      '123',
      ['12:a'],
      join(destination, 'missing')
    )
    const filePath = join(destination, 'file')
    writeFileSync(filePath, 'not a directory')
    const nonDirectory = await manager.downloadExtras('123', ['12:a'], filePath)

    expect(missing).toEqual({ downloaded: [], failed: ['12:a'] })
    expect(nonDirectory).toEqual({ downloaded: [], failed: ['12:a'] })
    expect(downloadFile).not.toHaveBeenCalled()
  })
})
