import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LegendaryAccount } from 'common/types'

interface EpicAccountsManagerProps {
  accounts: LegendaryAccount[]
  activeAccountId?: string
  disabled: boolean
  onAddAccount: () => void | Promise<void>
  onRemoveAccount: (accountId: string) => Promise<string>
  onSwitchAccount: (accountId: string) => Promise<string>
}

export default function EpicAccountsManager({
  accounts,
  activeAccountId,
  disabled,
  onAddAccount,
  onRemoveAccount,
  onSwitchAccount
}: EpicAccountsManagerProps) {
  const { t } = useTranslation()
  const [busyAccountId, setBusyAccountId] = useState<string>()
  const hasAccounts = accounts.length > 0

  async function handleSwitch(accountId: string) {
    if (disabled || accountId === activeAccountId) {
      return
    }

    setBusyAccountId(accountId)
    await onSwitchAccount(accountId)
    setBusyAccountId(undefined)
  }

  async function handleRemove(account: LegendaryAccount) {
    if (disabled) {
      return
    }

    const confirmed = window.confirm(
      t(
        'login.epic.accounts.remove_confirm',
        'Remove {{account}} from Heroic?',
        { account: account.displayName }
      )
    )

    if (!confirmed) {
      return
    }

    setBusyAccountId(account.account_id)
    await onRemoveAccount(account.account_id)
    setBusyAccountId(undefined)
  }

  return (
    <div className="epicAccountsManager">
      <div className="epicAccountsHeader">
        <span>{t('login.epic.accounts.title', 'Epic Accounts')}</span>
        <button
          className="epicAccountButton primary"
          disabled={disabled}
          onClick={() => void onAddAccount()}
        >
          {t('login.epic.accounts.add', 'Add Account')}
        </button>
      </div>

      {hasAccounts ? (
        <div className="epicAccountsList">
          {accounts.map((account) => {
            const isActive = account.account_id === activeAccountId
            const isBusy = account.account_id === busyAccountId
            const lastUsed = new Date(account.lastUsed).toLocaleDateString()

            return (
              <div className="epicAccountRow" key={account.account_id}>
                <div className="epicAccountDetails">
                  <div className="epicAccountName">{account.displayName}</div>
                  <div className="epicAccountMeta">
                    {isActive
                      ? t('login.epic.accounts.active', 'Active')
                      : t(
                          'login.epic.accounts.last_used',
                          'Last used {{date}}',
                          {
                            date: lastUsed
                          }
                        )}
                  </div>
                </div>
                <div className="epicAccountActions">
                  {!isActive && (
                    <button
                      className="epicAccountButton"
                      disabled={disabled || isBusy}
                      onClick={() => void handleSwitch(account.account_id)}
                    >
                      {isBusy
                        ? t('login.epic.accounts.switching', 'Switching')
                        : t('login.epic.accounts.switch', 'Switch')}
                    </button>
                  )}
                  <button
                    className="epicAccountButton danger"
                    disabled={disabled || isBusy}
                    onClick={() => void handleRemove(account)}
                  >
                    {t('login.epic.accounts.remove', 'Remove')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="epicAccountsEmpty">
          {t(
            'login.epic.accounts.empty',
            'Epic accounts you add will be saved here for switching.'
          )}
        </p>
      )}
    </div>
  )
}
