import type { AxiosResponse } from 'axios'
import { ProductsEndpointData } from 'common/types/gog'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
  bonusContent: NonNullable<ProductsEndpointData['downloads']>['bonus_content']
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
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce()

    await expect(
      manager.downloadExtras('123', ['12:a', '12:b'], destination)
    ).resolves.toEqual({
      downloaded: ['manual (2).pdf'],
      failed: ['12:a']
    })
    expect(downloadFile).toHaveBeenNthCalledWith(1, {
      url: 'https://cdn.gog.com/manual.pdf',
      dest: join(destination, 'manual (1).pdf')
    })
    expect(downloadFile).toHaveBeenNthCalledWith(2, {
      url: 'https://cdn.gog.com/manual.pdf',
      dest: join(destination, 'manual (2).pdf')
    })
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
