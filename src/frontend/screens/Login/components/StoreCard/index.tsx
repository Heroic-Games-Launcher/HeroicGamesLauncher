import {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useContext,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames'
import { LogIn, LogOut, Store } from 'lucide-react'
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
  notice?: ReactNode
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
  notice,
  disabled = false
}: StoreCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showDialogModal } = useContext(ContextProvider)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const openStore = () => navigate(storeRoute)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Only open the store when the card itself is focused. When a child
    // button (e.g. "Log in") is focused, let that button handle Enter/Space
    // so it does not also trigger store navigation.
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openStore()
    }
  }

  async function performLogout() {
    setIsLoggingOut(true)
    await logout()
    setIsLoggingOut(false)
  }

  function handleLogout(event: MouseEvent) {
    event.stopPropagation()
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

  return (
    <div
      className={classNames('storeCard', storeKey, { disabled })}
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('.storeCard__actions')) return
        openStore()
      }}
      onKeyDown={handleKeyDown}
    >
      <FeatureCard
        className="storeCard__card"
        layout="inline"
        icon={<StoreBadge runner={runner} className="storeCard__badge" />}
        title={title}
        description={description}
        meta={
          isLoggedIn && displayName ? (
            <Badge variant="neutral" className="storeCard__loggedBadge">
              <span className="storeCard__loggedLabel">
                {t('login.logged_in', 'Logged in')}:
              </span>
              <span className="storeCard__userName">{displayName}</span>
            </Badge>
          ) : undefined
        }
        action={
          <div className="storeCard__actions">
            {notice}
            {isLoggedIn ? (
              <Button
                variant="dangerSubtle"
                size="md"
                fullWidth
                icon={<Icon glyph={LogOut} size="md" />}
                disabled={isLoggingOut}
                onClick={(e) => {
                  e.stopPropagation()
                  handleLogout(e)
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {isLoggingOut
                  ? `${t('userselector.logging_out', 'Logging out')}...`
                  : t('userselector.logout', 'Logout')}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  icon={<Icon glyph={LogIn} size="md" />}
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (loginAction) loginAction()
                    else if (loginUrl) navigate(loginUrl)
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {t('login.button', 'Log in')}
                </Button>
                {alternativeLoginAction && (
                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      alternativeLoginAction?.()
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {t('login.alternative_method', 'Alternative login method')}
                  </Button>
                )}
              </>
            )}
            <Button
              variant="tertiary"
              size="md"
              fullWidth
              icon={<Icon glyph={Store} size="md" />}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                void openStore()
              }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {t('login.browse_store', 'Browse store')}
            </Button>
          </div>
        }
      />
    </div>
  )
}
