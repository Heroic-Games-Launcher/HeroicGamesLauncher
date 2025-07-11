import { syncSaves } from '../games'
import * as library from '../library'

jest.mock('backend/logger')

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

    jest.spyOn(library, 'hasGame').mockReturnValue(true)

    const testPath =
      process.platform === 'win32' ? 'C:\\my\\path' : '/home/someone/saves/path'

    await syncSaves(appName, '', testPath)
    expect(spy.mock.lastCall?.[0]).toEqual({
      subcommand: 'sync-saves',
      appName: 'SomeAppName',
      '': true,
      '--save-path': testPath,
      '-y': true
    })
  })

  it('Save-sync fails with empty path', async () => {
    jest.spyOn(library, 'runRunnerCommand')
    expect(await syncSaves('SomeAppName', '', '')).toBe('No path provided.')
  })
})
