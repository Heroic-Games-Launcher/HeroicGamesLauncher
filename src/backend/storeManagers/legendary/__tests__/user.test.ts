import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { ensureDirSync, removeSync } from 'fs-extra'
import { join } from 'path'
import { session } from 'electron'

import { configStore } from 'backend/constants/key_value_stores'
import { libraryManagerMap } from '../..'
import { LegendaryUser } from '../user'
import {
  legendaryAccountsPath,
  legendaryConfigPath,
  legendaryTempLoginPath
} from '../constants'

jest.mock('electron')
jest.mock('electron-store')
jest.mock('backend/logger', () => ({
  LogPrefix: {
    Legendary: 'Legendary'
  },
  logError: jest.fn()
}))

jest.mock('../..', () => ({
  libraryManagerMap: {
    legendary: {
      runRunnerCommand: jest.fn()
    }
  }
}))

const mockRunRunnerCommand = libraryManagerMap.legendary
  .runRunnerCommand as jest.Mock

const writeLegendaryProfile = (
  profilePath: string,
  account_id: string,
  displayName: string,
  marker: string
) => {
  ensureDirSync(profilePath)
  writeFileSync(
    join(profilePath, 'user.json'),
    JSON.stringify({ account_id, displayName })
  )
  writeFileSync(join(profilePath, 'marker.txt'), marker)
}

const readProfileUser = (profilePath: string) =>
  JSON.parse(readFileSync(join(profilePath, 'user.json'), 'utf8')) as {
    account_id: string
    displayName: string
  }

const writeInstalledMetadata = (profilePath: string, appName: string) => {
  writeFileSync(
    join(profilePath, 'installed.json'),
    JSON.stringify({
      [appName]: {
        app_name: appName,
        install_path: `/games/${appName}`
      }
    })
  )
}

const accountProfilePath = (accountId: string) =>
  join(legendaryAccountsPath, accountId)

describe('LegendaryUser account management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    configStore.clear()
    mockRunRunnerCommand.mockReset()
    removeSync(legendaryConfigPath)
    removeSync(legendaryAccountsPath)
    removeSync(legendaryTempLoginPath)
  })

  test('logs an additional account into a temporary profile before promoting it', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account before add'
    )
    writeInstalledMetadata(legendaryConfigPath, 'Sugar')

    mockRunRunnerCommand.mockImplementation(async (_command, options) => {
      if (options?.env?.LEGENDARY_CONFIG_PATH) {
        expect(options.env.LEGENDARY_CONFIG_PATH).toBe(legendaryTempLoginPath)
        writeLegendaryProfile(
          options.env.LEGENDARY_CONFIG_PATH,
          'account-b',
          'Account B',
          'temporary add account profile'
        )
      }
      return { stdout: '', stderr: '' }
    })

    const result = await LegendaryUser.login('auth-code', { addAccount: true })

    expect(result).toEqual({
      status: 'done',
      data: {
        account_id: 'account-b',
        displayName: 'Account B',
        user: expect.any(String)
      }
    })
    expect(mockRunRunnerCommand).toHaveBeenCalledWith(
      { subcommand: 'auth', '--code': 'auth-code' },
      expect.objectContaining({
        abortId: 'legendary-add-account-login',
        env: { LEGENDARY_CONFIG_PATH: legendaryTempLoginPath }
      })
    )
    expect(readProfileUser(legendaryConfigPath)).toMatchObject({
      account_id: 'account-b',
      displayName: 'Account B'
    })
    expect(
      readFileSync(join(accountProfilePath('account-a'), 'marker.txt'), 'utf8')
    ).toBe('active account before add')
    expect(
      readFileSync(join(accountProfilePath('account-b'), 'marker.txt'), 'utf8')
    ).toBe('temporary add account profile')
    expect(
      JSON.parse(
        readFileSync(join(accountProfilePath('account-b'), 'installed.json'), {
          encoding: 'utf8'
        })
      )
    ).toHaveProperty('Sugar')
    expect(
      JSON.parse(
        readFileSync(join(legendaryConfigPath, 'installed.json'), {
          encoding: 'utf8'
        })
      )
    ).toHaveProperty('Sugar')
    expect(existsSync(legendaryTempLoginPath)).toBe(false)
    expect(configStore.get_nodefault('legendaryAccounts.activeAccountId')).toBe(
      'account-b'
    )
    expect(configStore.get('legendaryAccounts.accounts', [])).toHaveLength(2)
  })

  test('rejects an additional login for an account that is already saved', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account before add'
    )

    mockRunRunnerCommand.mockImplementation(async (_command, options) => {
      if (options?.env?.LEGENDARY_CONFIG_PATH) {
        writeLegendaryProfile(
          options.env.LEGENDARY_CONFIG_PATH,
          'account-a',
          'Account A',
          'duplicate temporary profile'
        )
      }
      return { stdout: '', stderr: '' }
    })

    const result = await LegendaryUser.login('auth-code', { addAccount: true })

    expect(result).toEqual({
      status: 'failed',
      data: undefined,
      message: 'Account A is already saved in Heroic'
    })
    expect(existsSync(legendaryTempLoginPath)).toBe(false)
    expect(readProfileUser(legendaryConfigPath)).toMatchObject({
      account_id: 'account-a',
      displayName: 'Account A'
    })
    expect(configStore.get('legendaryAccounts.accounts', [])).toHaveLength(1)
  })

  test('recovers install metadata from a saved profile when the active profile is missing it', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account before add'
    )
    writeLegendaryProfile(
      accountProfilePath('account-a'),
      'account-a',
      'Account A',
      'saved account profile'
    )
    writeInstalledMetadata(accountProfilePath('account-a'), 'Sugar')

    mockRunRunnerCommand.mockImplementation(async (_command, options) => {
      if (options?.env?.LEGENDARY_CONFIG_PATH) {
        writeLegendaryProfile(
          options.env.LEGENDARY_CONFIG_PATH,
          'account-b',
          'Account B',
          'temporary add account profile'
        )
      }
      return { stdout: '', stderr: '' }
    })

    const result = await LegendaryUser.login('auth-code', { addAccount: true })

    expect(result.status).toBe('done')
    expect(
      JSON.parse(
        readFileSync(join(legendaryConfigPath, 'installed.json'), {
          encoding: 'utf8'
        })
      )
    ).toHaveProperty('Sugar')
    expect(
      JSON.parse(
        readFileSync(join(accountProfilePath('account-a'), 'installed.json'), {
          encoding: 'utf8'
        })
      )
    ).toHaveProperty('Sugar')
    expect(
      JSON.parse(
        readFileSync(join(accountProfilePath('account-b'), 'installed.json'), {
          encoding: 'utf8'
        })
      )
    ).toHaveProperty('Sugar')
  })

  test('switches accounts by restoring the selected profile without removing others', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account before add'
    )
    writeInstalledMetadata(legendaryConfigPath, 'Sugar')
    mockRunRunnerCommand.mockImplementation(async (_command, options) => {
      if (options?.env?.LEGENDARY_CONFIG_PATH) {
        writeLegendaryProfile(
          options.env.LEGENDARY_CONFIG_PATH,
          'account-b',
          'Account B',
          'temporary add account profile'
        )
      }
      return { stdout: '', stderr: '' }
    })

    await LegendaryUser.login('auth-code', { addAccount: true })
    expect(
      configStore
        .get('legendaryAccounts.accounts', [])
        .map((account) => account.account_id)
    ).toEqual(['account-b', 'account-a'])
    expect(existsSync(accountProfilePath('account-a'))).toBe(true)
    const result = await LegendaryUser.switchAccount('account-a')

    expect(result.status).toBe('done')
    expect(readProfileUser(legendaryConfigPath)).toMatchObject({
      account_id: 'account-a',
      displayName: 'Account A'
    })
    expect(
      JSON.parse(
        readFileSync(join(legendaryConfigPath, 'installed.json'), {
          encoding: 'utf8'
        })
      )
    ).toHaveProperty('Sugar')
    expect(
      JSON.parse(
        readFileSync(join(accountProfilePath('account-a'), 'installed.json'), {
          encoding: 'utf8'
        })
      )
    ).toHaveProperty('Sugar')
    expect(configStore.get_nodefault('legendaryAccounts.activeAccountId')).toBe(
      'account-a'
    )
    expect(existsSync(accountProfilePath('account-a'))).toBe(true)
    expect(existsSync(accountProfilePath('account-b'))).toBe(true)
    expect(session.defaultSession.clearStorageData).not.toHaveBeenCalled()
    expect(session.defaultSession.clearData).not.toHaveBeenCalled()
  })

  test('removes an inactive account while preserving the active account', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account before add'
    )
    mockRunRunnerCommand.mockImplementation(async (_command, options) => {
      if (options?.env?.LEGENDARY_CONFIG_PATH) {
        writeLegendaryProfile(
          options.env.LEGENDARY_CONFIG_PATH,
          'account-b',
          'Account B',
          'temporary add account profile'
        )
      }
      return { stdout: '', stderr: '' }
    })

    await LegendaryUser.login('auth-code', { addAccount: true })
    await LegendaryUser.switchAccount('account-a')
    const result = await LegendaryUser.removeAccount('account-b')

    expect(result.status).toBe('done')
    expect(readProfileUser(legendaryConfigPath)).toMatchObject({
      account_id: 'account-a',
      displayName: 'Account A'
    })
    expect(existsSync(accountProfilePath('account-a'))).toBe(true)
    expect(existsSync(accountProfilePath('account-b'))).toBe(false)
    expect(
      configStore
        .get('legendaryAccounts.accounts', [])
        .map((account) => account.account_id)
    ).toEqual(['account-a'])
  })

  test('does not report success when removing the active account fails to log out', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account'
    )
    LegendaryUser.getAccounts()
    mockRunRunnerCommand.mockResolvedValue({
      stdout: '',
      stderr: '',
      error: 'logout failed'
    })

    const result = await LegendaryUser.removeAccount('account-a')

    expect(result.status).toBe('failed')
    expect(result.activeAccountId).toBe('account-a')
    expect(readProfileUser(legendaryConfigPath).account_id).toBe('account-a')
    expect(existsSync(accountProfilePath('account-a'))).toBe(true)
  })

  test('rejects an invalid saved profile without replacing the active profile', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account'
    )
    LegendaryUser.getAccounts()
    writeLegendaryProfile(
      accountProfilePath('account-b'),
      'wrong-account',
      'Wrong Account',
      'invalid saved profile'
    )
    configStore.set('legendaryAccounts.accounts', [
      {
        account_id: 'account-b',
        displayName: 'Account B',
        user: 'test',
        lastLogin: 0,
        lastUsed: 0
      },
      ...configStore.get('legendaryAccounts.accounts', [])
    ])

    const result = await LegendaryUser.switchAccount('account-b')

    expect(result.status).toBe('failed')
    expect(readProfileUser(legendaryConfigPath).account_id).toBe('account-a')
  })

  test('recovers each missing install metadata file independently', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account'
    )
    writeInstalledMetadata(legendaryConfigPath, 'Sugar')
    writeLegendaryProfile(
      accountProfilePath('account-a'),
      'account-a',
      'Account A',
      'saved account'
    )
    writeFileSync(
      join(accountProfilePath('account-a'), 'third-party-installed.json'),
      JSON.stringify({ external: { app_name: 'external' } })
    )
    mockRunRunnerCommand.mockImplementation(async (_command, options) => {
      if (options?.env?.LEGENDARY_CONFIG_PATH) {
        writeLegendaryProfile(
          options.env.LEGENDARY_CONFIG_PATH,
          'account-b',
          'Account B',
          'new account'
        )
      }
      return { stdout: '', stderr: '' }
    })

    const result = await LegendaryUser.login('auth-code', { addAccount: true })

    expect(result.status).toBe('done')
    expect(existsSync(join(legendaryConfigPath, 'installed.json'))).toBe(true)
    expect(
      existsSync(join(legendaryConfigPath, 'third-party-installed.json'))
    ).toBe(true)
  })

  test('keeps the active profile when staged install metadata cannot be written', async () => {
    writeLegendaryProfile(
      legendaryConfigPath,
      'account-a',
      'Account A',
      'active account'
    )
    writeInstalledMetadata(legendaryConfigPath, 'Sugar')
    LegendaryUser.getAccounts()
    writeLegendaryProfile(
      accountProfilePath('account-b'),
      'account-b',
      'Account B',
      'saved account'
    )
    configStore.set('legendaryAccounts.accounts', [
      {
        account_id: 'account-b',
        displayName: 'Account B',
        user: 'test',
        lastLogin: 0,
        lastUsed: 0
      },
      ...configStore.get('legendaryAccounts.accounts', [])
    ])

    const gracefulFsModule =
      jest.requireActual<typeof import('graceful-fs')>('graceful-fs')
    const originalWriteFileSync = gracefulFsModule.writeFileSync
    const writeFileSpy = jest
      .spyOn(gracefulFsModule, 'writeFileSync')
      .mockImplementation(((file, data, options) => {
        if (
          String(file).includes('account-b.new') &&
          String(file).endsWith('installed.json')
        ) {
          throw new Error('simulated metadata write failure')
        }
        return originalWriteFileSync(file, data, options)
      }) as typeof gracefulFsModule.writeFileSync)

    const result = await LegendaryUser.switchAccount('account-b')
    writeFileSpy.mockRestore()

    expect(result.status).toBe('failed')
    expect(readProfileUser(legendaryConfigPath).account_id).toBe('account-a')
    expect(configStore.get_nodefault('legendaryAccounts.activeAccountId')).toBe(
      'account-a'
    )
    expect(readProfileUser(accountProfilePath('account-b')).account_id).toBe(
      'account-b'
    )
  })
})
