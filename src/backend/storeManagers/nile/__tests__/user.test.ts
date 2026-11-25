import { NileLoginData } from 'common/types/nile'
import { libraryManagerMap } from '../..'
import { configStore } from '../electronStores'
import { NileUser } from '../user'

jest.mock('electron', () => ({
  session: {
    fromPartition: () => ({
      clearStorageData: () => Promise.resolve(),
      clearCache: () => Promise.resolve(),
      clearAuthCache: () => Promise.resolve()
    })
  }
}))

jest.mock('backend/logger', () => ({
  LogPrefix: { Nile: 'Nile' },
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn()
}))

jest.mock('backend/utils', () => ({
  clearCache: jest.fn()
}))

jest.mock('../electronStores', () => ({
  configStore: {
    delete: jest.fn(),
    get_nodefault: jest.fn(),
    set: jest.fn()
  }
}))

jest.mock('../constants', () => ({
  nileUserData: '/tmp/heroic-nile-test-current_user.json'
}))

jest.mock('../..', () => ({
  libraryManagerMap: {
    nile: {
      runRunnerCommand: jest.fn()
    }
  }
}))

const nileMock = libraryManagerMap.nile as unknown as {
  runRunnerCommand: jest.Mock
}
const runRunnerCommand = nileMock.runRunnerCommand

const configStoreMock = configStore as unknown as {
  delete: jest.Mock
  get_nodefault: jest.Mock
}

const loginData: NileLoginData = {
  url: 'https://www.amazon.com/ap/register?client_id=test',
  code_verifier: 'code-verifier',
  serial: 'serial',
  client_id: 'client-id'
}

describe('NileUser.getLoginData', () => {
  it('returns the login data from nile', async () => {
    runRunnerCommand.mockResolvedValueOnce({
      stdout: JSON.stringify(loginData),
      stderr: ''
    })

    await expect(NileUser.getLoginData()).resolves.toEqual(loginData)
    expect(runRunnerCommand).toHaveBeenCalledTimes(1)
  })

  it('resets a stale nile session and retries', async () => {
    configStoreMock.get_nodefault.mockReturnValue(undefined)
    runRunnerCommand
      .mockResolvedValueOnce({
        stdout: '',
        stderr: 'ERROR [CLI]: You are already logged in'
      })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({
        stdout: JSON.stringify(loginData),
        stderr: ''
      })

    await expect(NileUser.getLoginData()).resolves.toEqual(loginData)
    expect(runRunnerCommand).toHaveBeenNthCalledWith(
      1,
      ['auth', '--login', '--non-interactive'],
      expect.anything()
    )
    expect(runRunnerCommand).toHaveBeenNthCalledWith(
      2,
      ['auth', '--logout'],
      expect.anything()
    )
    expect(runRunnerCommand).toHaveBeenNthCalledWith(
      3,
      ['auth', '--login', '--non-interactive'],
      expect.anything()
    )
  })

  it('keeps the session when Heroic already knows the account', async () => {
    configStoreMock.get_nodefault.mockReturnValue({
      user_id: 'user-id',
      name: 'Player'
    })
    runRunnerCommand.mockResolvedValueOnce({
      stdout: '',
      stderr: 'ERROR [CLI]: You are already logged in'
    })

    await expect(NileUser.getLoginData()).rejects.toThrow(
      'Nile did not return login data'
    )
    expect(runRunnerCommand).toHaveBeenCalledTimes(1)
    expect(configStoreMock.delete).not.toHaveBeenCalled()
  })

  it('throws a readable error when nile returns no login data', async () => {
    runRunnerCommand.mockResolvedValueOnce({
      stdout: '',
      stderr: 'some failure'
    })

    await expect(NileUser.getLoginData()).rejects.toThrow(
      'Nile did not return login data: some failure'
    )
  })
})
