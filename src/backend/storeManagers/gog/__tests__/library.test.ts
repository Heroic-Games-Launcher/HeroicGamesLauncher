import { callRunner } from 'backend/launcher'
import GOGLibraryManager from '../library'

jest.mock('backend/logger')
jest.mock('backend/launcher', () => ({ callRunner: jest.fn() }))
jest.mock('backend/utils', () => ({
  ...jest.requireActual<typeof import('backend/utils')>('backend/utils'),
  getGOGdlBin: () => ({ dir: '', bin: 'gogdl' })
}))
// storeManagers/index constructs GOGLibraryManager while library.ts is still loading
jest.mock('../../index', () => ({ libraryManagerMap: {} }))

describe('GOGLibraryManager.runRunnerCommand', () => {
  const run = async (command: string, exitCode: number, abort?: boolean) => {
    jest
      .mocked(callRunner)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode, abort })
    return new GOGLibraryManager().runRunnerCommand([command, '1207664643'])
  }

  it('turns a non-zero exit of a download command into an error', async () => {
    for (const command of ['download', 'update', 'repair', 'redist']) {
      expect((await run(command, 1)).error).toBe('gogdl exited with code 1')
    }
  })

  it('leaves successful and aborted downloads alone', async () => {
    expect((await run('update', 0)).error).toBeUndefined()
    expect((await run('update', 241, true)).error).toBeUndefined()
  })

  it("ignores the exit code of launch, which is the game's own", async () => {
    expect((await run('launch', 1)).error).toBeUndefined()
  })
})
