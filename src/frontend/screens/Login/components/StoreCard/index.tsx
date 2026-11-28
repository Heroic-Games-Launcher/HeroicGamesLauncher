import { ReactNode, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames'
import {
  Circle,
  CircleCheck,
  LoaderCircle,
  LogIn,
  LogOut,
  Store
} from 'lucide-react'
import { Runner } from 'common/types'
import FeatureCard from 'frontend/components/UI/FeatureCard'
import Badge from 'frontend/components/UI/Badge'
import Button from 'frontend/components/UI/Button'
import Icon from 'frontend/components/UI/Icon'
import StoreBadge from 'frontend/components/UI/StoreBadge'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

interface StoreCardProps {
  storeKey: string
  runner: Runner
  title: string
  description: string
  isLoggedIn: boolean
  user?: string
  loginUrl?: string
  storeRoute: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logout: () => any
  /** Primary login via a custom action (e.g. a modal) instead of loginUrl */
  loginAction?: () => void
  alternativeLoginAction?: () => void
  disabled?: boolean
}

const maxNameLength = 20

export default function StoreCard({
  storeKey,
  runner,
  title,
  description,
  isLoggedIn,
  user,
  loginUrl,
  storeRoute,
  logout,
  loginAction,
  alternativeLoginAction,
  disabled = false
}: StoreCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showDialogModal } = useContext(ContextProvider)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const openStore = () => {
    void navigate(storeRoute)
  }

  const login = () => {
    if (loginAction) loginAction()
    else if (loginUrl) void navigate(loginUrl)
  }

  async function performLogout() {
    setIsLoggingOut(true)
    await logout()
    setIsLoggingOut(false)
  }

  function handleLogout() {
    showDialogModal({
      title: t('login.logout_confirm.title', 'Log out?'),
      message: t(
        'login.logout_confirm.message',
        'Are you sure you want to log out of {{store}}?',
        { store: title }
      ),
      buttons: [
        {
          text: t('userselector.logout', 'Logout'),
          onClick: () => {
            void performLogout()
          }
        },
        { text: t('button.cancel', 'Cancel') }
      ],
      type: 'MESSAGE'
    })
  }

  const displayName = user
    ? String(user).slice(0, maxNameLength) +
      (String(user).length > maxNameLength ? '...' : '')
    : ''

  const status: ReactNode = isLoggedIn ? (
    <Badge
      variant="success"
      glyph={CircleCheck}
      className="storeCard__status"
      title={user ? String(user) : undefined}
    >
      {displayName
        ? t('login.status.connected_as', 'Connected as {{user}}', {
            user: displayName
          })
        : t('login.status.connected', 'Connected')}
    </Badge>
  ) : (
    <Badge variant="neutral" glyph={Circle} className="storeCard__status">
      {t('login.status.not_connected', 'Not connected')}
    </Badge>
  )

  const browseStoreButton = (
    <Button
      variant={isLoggedIn ? 'secondary' : 'ghost'}
      size="md"
      icon={<Icon glyph={Store} size="md" />}
      disabled={disabled}
      onClick={openStore}
      className="storeCard__browse"
    >
      {t('login.browse_store', 'Browse store')}
    </Button>
  )

  return (
    <div className={classNames('storeCard', storeKey, { disabled })}>
      <FeatureCard
        className="storeCard__card"
        layout="stacked"
        icon={<StoreBadge runner={runner} className="storeCard__badge" />}
        title={title}
        description={description}
        meta={status}
        action={
          <div className="storeCard__actions">
            {isLoggedIn ? (
              <div className="storeCard__actionRow">
                {browseStoreButton}
                <Button
                  variant="tertiary"
                  size="md"
                  icon={
                    <Icon
                      glyph={isLoggingOut ? LoaderCircle : LogOut}
                      size="md"
                      className={isLoggingOut ? 'lucide-spin' : undefined}
                    />
                  }
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="storeCard__logout"
                >
                  {isLoggingOut
                    ? `${t('userselector.logging_out', 'Logging out')}...`
                    : t('userselector.logout', 'Logout')}
                </Button>
              </div>
            ) : (
              <div
                className={classNames('storeCard__actionRow', {
                  'storeCard__actionRow--withAlternative':
                    alternativeLoginAction
                })}
              >
                <Button
                  variant="secondary"
                  size="md"
                  icon={<Icon glyph={LogIn} size="md" />}
                  disabled={disabled}
                  onClick={login}
                  className="storeCard__login"
                >
                  {t('login.button', 'Log in')}
                </Button>
                {browseStoreButton}
                {alternativeLoginAction && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={disabled}
                    onClick={alternativeLoginAction}
                    className="storeCard__alternativeLogin"
                  >
                    {t('login.alternative_method', 'Alternative login')}
                  </Button>
                )}
              </div>
            )}
          </div>
        }
      />
    </div>
  )
}
