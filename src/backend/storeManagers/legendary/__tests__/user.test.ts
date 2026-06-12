import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { ensureDirSync, removeSync } from 'fs-extra'
import { join } from 'path'

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
})
