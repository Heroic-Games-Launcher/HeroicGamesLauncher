import { syncSaves } from '../games'
import * as library from '../library'

// Mock functions that the actual implementation depends on
jest.mock('../../../logger/logger')
jest.mock('../../../logger/logfile')

describe('syncSaves', () => {
  test("returns 'No path provided.' if path parameter is falsy", async () => {
    const appName = 'test'
    const arg = ''
    const path = ''

    const result = await syncSaves(appName, arg, path)

    expect(result).toBe('No path provided.')
  })

  it('Save-sync uses correct path', async () => {
    const appName = 'SomeAppName'

    const spy = jest
      .spyOn(library, 'runRunnerCommand')
      .mockImplementation(async () => {
        return { stderr: '', stdout: '' }
      })

    const paths = ['C:\\my\\path', '/home/someone/saves/path']
    for (const path of paths) {
      await syncSaves(appName, '', path)
      expect(spy.mock.lastCall?.[0]).toEqual([
        'sync-saves',
        '',
        '--save-path',
        path,
        'SomeAppName',
        '-y'
      ])
    }
  })

  it('Save-sync fails with empty path', async () => {
    jest.spyOn(library, 'runRunnerCommand')
    expect(await syncSaves('SomeAppName', '', '')).toBe('No path provided.')
  })
})
