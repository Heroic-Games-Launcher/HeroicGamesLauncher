import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import {
  copySync,
  ensureDirSync,
  pathExistsSync,
  readdirSync,
  removeSync
} from 'fs-extra'
import { join } from 'path'

import { LegendaryAccount, UserInfo } from 'common/types'
import { clearCache } from '../../utils'
import { logError, LogPrefix } from 'backend/logger'
import { userInfo as user } from 'os'
import { session } from 'electron'
import { libraryManagerMap } from '..'
import { LegendaryCommand } from './commands'
import { NonEmptyString } from './commands/base'
import { configStore } from 'backend/constants/key_value_stores'
import {
  legendaryAccountsPath,
  legendaryConfigPath,
  legendaryTempLoginPath,
  legendaryUserInfo
} from './constants'

export class LegendaryUser {
  public static async login(
    authorizationCode: string,
    options?: { addAccount?: boolean }
  ): Promise<{
    status: 'done' | 'failed'
    data: UserInfo | undefined
    message?: string
  }> {
    if (options?.addAccount) {
      return this.loginAdditionalAccount(authorizationCode)
    }

    const currentUser = this.getUserInfo()
    if (currentUser) {
      this.saveCurrentAccount(currentUser)
    }

    const command: LegendaryCommand = {
      subcommand: 'auth',
      '--code': NonEmptyString.parse(authorizationCode)
    }

    const errorMessage = (
      error: string
    ): { status: 'failed'; data: undefined; message: string } => {
      logError(['Failed to login with Legendary:', error], LogPrefix.Legendary)

      return { status: 'failed', data: undefined, message: error }
    }

    try {
      const res = await libraryManagerMap['legendary'].runRunnerCommand(
        command,
        {
          abortId: 'legendary-login',
          logMessagePrefix: 'Logging in'
        }
      )

      if (res.stderr.includes('ERROR: Logging in ')) {
        return errorMessage(res.stderr)
      }

      if (res.error || res.abort) {
        return errorMessage(res.error ?? 'abort by user')
      }

      const userInfo = this.getUserInfo()
      if (userInfo) {
        this.saveCurrentAccount(userInfo)
      }
      return { status: 'done', data: userInfo }
    } catch (error) {
      return errorMessage(`${error}`)
    }
  }

  private static async loginAdditionalAccount(
    authorizationCode: string
  ): Promise<{
    status: 'done' | 'failed'
    data: UserInfo | undefined
    message?: string
  }> {
    const localInstallMetadata = this.getLocalInstallMetadata()
    const currentUser = this.getUserInfo()
    if (currentUser) {
      this.saveCurrentAccount(currentUser)
    }

    const command: LegendaryCommand = {
      subcommand: 'auth',
      '--code': NonEmptyString.parse(authorizationCode)
    }

    const errorMessage = (
      error: string
    ): { status: 'failed'; data: undefined; message: string } => {
      removeSync(legendaryTempLoginPath)
      logError(
        ['Failed to login additional Epic account with Legendary:', error],
        LogPrefix.Legendary
      )

      return { status: 'failed', data: undefined, message: error }
    }

    try {
      removeSync(legendaryTempLoginPath)
      ensureDirSync(legendaryTempLoginPath)

      const res = await libraryManagerMap['legendary'].runRunnerCommand(
        command,
        {
          abortId: 'legendary-add-account-login',
          logMessagePrefix: 'Logging in additional Epic account',
          env: {
            LEGENDARY_CONFIG_PATH: legendaryTempLoginPath
          }
        }
      )

      if (res.stderr.includes('ERROR: Logging in ')) {
        return errorMessage(res.stderr)
      }

      if (res.error || res.abort) {
        return errorMessage(res.error ?? 'abort by user')
      }

      const userInfo = this.getUserInfoFromPath(
        join(legendaryTempLoginPath, 'user.json')
      )

      if (!userInfo) {
        return errorMessage('Legendary did not create user info')
      }

      const existingAccount = this.getAccounts().find(
        (account) => account.account_id === userInfo.account_id
      )
      if (existingAccount) {
        return errorMessage(
          `${existingAccount.displayName} is already saved in Heroic`
        )
      }

      const accountPath = this.getAccountPath(userInfo.account_id)
      removeSync(accountPath)
      ensureDirSync(legendaryAccountsPath)
      copySync(legendaryTempLoginPath, accountPath, { overwrite: true })
      this.restoreLocalInstallMetadata(accountPath, localInstallMetadata)
      removeSync(legendaryConfigPath)
      ensureDirSync(legendaryConfigPath)
      copySync(accountPath, legendaryConfigPath, { overwrite: true })
      this.restoreLocalInstallMetadata(
        legendaryConfigPath,
        localInstallMetadata
      )
      removeSync(legendaryTempLoginPath)

      configStore.set('userInfo', userInfo)
      configStore.set('legendaryAccounts.activeAccountId', userInfo.account_id)
      this.upsertAccount(userInfo, true)
      clearCache('legendary')

      return { status: 'done', data: userInfo }
    } catch (error) {
      return errorMessage(`${error}`)
    }
  }

  public static async logout() {
    const userInfo = this.getUserInfo()
    const accountId =
      userInfo?.account_id ??
      configStore.get_nodefault('legendaryAccounts.activeAccountId')
    const command: LegendaryCommand = { subcommand: 'auth', '--delete': true }

    const res = await libraryManagerMap['legendary'].runRunnerCommand(command, {
      abortId: 'legendary-logout',
      logMessagePrefix: 'Logging out'
    })

    if (res.error || res.abort) {
      logError(
        ['Failed to logout:', res.error ?? 'abort by user'],
        LogPrefix.Legendary
      )
      return
    }

    await this.clearEpicWebSession()
    if (accountId) {
      this.removeStoredAccount(accountId)
    }
    configStore.delete('userInfo')
    configStore.delete('legendaryAccounts.activeAccountId')
    clearCache('legendary')
  }

  public static getAccounts(): LegendaryAccount[] {
    const accounts = configStore.get('legendaryAccounts.accounts', [])
    const currentUser = this.getUserInfo()

    if (!currentUser) {
      return accounts
    }

    const hasCurrentAccount = accounts.some(
      (account) => account.account_id === currentUser.account_id
    )

    if (hasCurrentAccount) {
      return accounts
    }

    this.saveCurrentAccount(currentUser)
    return configStore.get('legendaryAccounts.accounts', [])
  }

  public static async switchAccount(
    accountId: string
  ): Promise<{ status: 'done' | 'failed'; data: UserInfo | undefined }> {
    const accounts = this.getAccounts()
    const account = accounts.find((account) => account.account_id === accountId)

    if (!account) {
      logError(
        ['Failed to switch Epic account: account not found', accountId],
        LogPrefix.Legendary
      )
      return { status: 'failed', data: undefined }
    }

    const localInstallMetadata = this.getLocalInstallMetadata()
    const currentUser = this.getUserInfo()
    if (currentUser) {
      this.saveCurrentAccount(currentUser)
    }

    const accountPath = this.getAccountPath(account.account_id)
    if (!pathExistsSync(accountPath)) {
      logError(
        ['Failed to switch Epic account: profile not found', accountPath],
        LogPrefix.Legendary
      )
      return { status: 'failed', data: undefined }
    }

    try {
      removeSync(legendaryConfigPath)
      ensureDirSync(legendaryConfigPath)
      copySync(accountPath, legendaryConfigPath, { overwrite: true })
      this.restoreLocalInstallMetadata(
        legendaryConfigPath,
        localInstallMetadata
      )
      this.restoreLocalInstallMetadata(accountPath, localInstallMetadata)
      await this.clearEpicWebSession()

      const restoredUserInfo = this.getUserInfo() ?? account
      configStore.set('userInfo', restoredUserInfo)
      configStore.set('legendaryAccounts.activeAccountId', account.account_id)
      this.upsertAccount(restoredUserInfo, false)
      clearCache('legendary')

      return { status: 'done', data: restoredUserInfo }
    } catch (error) {
      logError(
        ['Failed to switch Epic account:', `${error}`],
        LogPrefix.Legendary
      )
      return { status: 'failed', data: undefined }
    }
  }

  public static async clearWebSession() {
    await this.clearEpicWebSession()
  }

  public static async removeAccount(accountId: string): Promise<{
    status: 'done' | 'failed'
    accounts: LegendaryAccount[]
    activeAccountId?: string
    data?: UserInfo
  }> {
    const activeAccountId =
      this.getUserInfo()?.account_id ??
      configStore.get_nodefault('legendaryAccounts.activeAccountId')

    if (accountId === activeAccountId) {
      await this.logout()
      return {
        status: 'done',
        accounts: this.getAccounts()
      }
    }

    const account = this.getAccounts().find(
      (account) => account.account_id === accountId
    )

    if (!account) {
      logError(
        ['Failed to remove Epic account: account not found', accountId],
        LogPrefix.Legendary
      )
      return {
        status: 'failed',
        accounts: this.getAccounts(),
        activeAccountId,
        data: this.getUserInfo()
      }
    }

    this.removeStoredAccount(accountId)

    return {
      status: 'done',
      accounts: this.getAccounts(),
      activeAccountId,
      data: this.getUserInfo()
    }
  }

  private static saveCurrentAccount(userInfo: UserInfo) {
    try {
      ensureDirSync(legendaryAccountsPath)
      const accountPath = this.getAccountPath(userInfo.account_id)
      removeSync(accountPath)
      copySync(legendaryConfigPath, accountPath, { overwrite: true })
      configStore.set('legendaryAccounts.activeAccountId', userInfo.account_id)
      this.upsertAccount(userInfo, true)
    } catch (error) {
      logError(
        ['Failed to save Epic account profile:', `${error}`],
        LogPrefix.Legendary
      )
    }
  }

  private static upsertAccount(userInfo: UserInfo, updateLoginTime: boolean) {
    const accounts = configStore.get('legendaryAccounts.accounts', [])
    const now = Date.now()
    const existingAccount = accounts.find(
      (account) => account.account_id === userInfo.account_id
    )

    const account: LegendaryAccount = {
      ...userInfo,
      lastLogin: updateLoginTime ? now : (existingAccount?.lastLogin ?? now),
      lastUsed: now
    }

    configStore.set('legendaryAccounts.accounts', [
      account,
      ...accounts.filter(
        (savedAccount) => savedAccount.account_id !== account.account_id
      )
    ])
  }

  private static removeStoredAccount(accountId: string) {
    const accounts = configStore.get('legendaryAccounts.accounts', [])
    configStore.set(
      'legendaryAccounts.accounts',
      accounts.filter((account) => account.account_id !== accountId)
    )
    removeSync(this.getAccountPath(accountId))
  }

  private static getAccountPath(accountId: string) {
    const safeAccountId = accountId.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
    return join(legendaryAccountsPath, safeAccountId)
  }

  private static getLocalInstallMetadata() {
    const activeMetadata =
      this.getLocalInstallMetadataFromPath(legendaryConfigPath)

    if (activeMetadata.length) {
      return activeMetadata
    }

    const savedProfileMetadata = this.getSavedProfileInstallMetadata()
    this.restoreLocalInstallMetadata(legendaryConfigPath, savedProfileMetadata)

    return savedProfileMetadata
  }

  private static getSavedProfileInstallMetadata() {
    if (!existsSync(legendaryAccountsPath)) {
      return []
    }

    for (const accountPath of readdirSync(legendaryAccountsPath)) {
      const metadata = this.getLocalInstallMetadataFromPath(
        join(legendaryAccountsPath, accountPath)
      )
      if (metadata.length) {
        return metadata
      }
    }

    return []
  }

  private static getLocalInstallMetadataFromPath(profilePath: string) {
    return ['installed.json', 'third-party-installed.json'].flatMap((file) => {
      const sourcePath = join(profilePath, file)
      if (!existsSync(sourcePath)) {
        return []
      }

      return [
        {
          file,
          contents: readFileSync(sourcePath)
        }
      ]
    })
  }

  private static restoreLocalInstallMetadata(
    profilePath: string,
    metadata: ReturnType<typeof LegendaryUser.getLocalInstallMetadata>
  ) {
    if (!metadata.length) {
      return
    }

    ensureDirSync(profilePath)
    metadata.forEach(({ file, contents }) => {
      writeFileSync(join(profilePath, file), contents)
    })
  }

  private static async clearEpicWebSession() {
    const sessions = [
      session.defaultSession,
      session.fromPartition('persist:epic'),
      session.fromPartition('persist:epicstore')
    ]

    await Promise.all(
      sessions.map(async (session) => {
        await session.clearStorageData()
        await session.clearCache()
        await session.clearAuthCache()
        await session.clearHostResolverCache()
        await session.clearData()
      })
    )
  }

  public static isLoggedIn() {
    return existsSync(legendaryUserInfo)
  }

  public static getUserInfo(): UserInfo | undefined {
    if (!LegendaryUser.isLoggedIn()) {
      configStore.delete('userInfo')
      return
    }
    try {
      const info = this.getUserInfoFromPath(legendaryUserInfo)
      if (!info) {
        return
      }
      configStore.set('userInfo', info)
      return info
    } catch (error) {
      logError(
        [`User info file corrupted, check ${legendaryUserInfo}. Error:`, error],
        LogPrefix.Legendary
      )
      return
    }
  }

  private static getUserInfoFromPath(
    userInfoPath: string
  ): UserInfo | undefined {
    if (!existsSync(userInfoPath)) {
      return
    }

    const userInfoContent = readFileSync(userInfoPath).toString()
    const userInfoObject = JSON.parse(userInfoContent)
    return {
      account_id: userInfoObject.account_id,
      displayName: userInfoObject.displayName,
      user: user().username
    }
  }
}
