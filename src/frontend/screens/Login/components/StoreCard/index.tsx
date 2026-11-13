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
import { CircleCheck } from 'lucide-react'
import { Runner } from 'common/types'
import FeatureCard from 'frontend/components/UI/FeatureCard'
import Button from 'frontend/components/UI/Button'
import StoreBadge from 'frontend/components/UI/StoreBadge'
import Tooltip from 'frontend/components/UI/Tooltip'
import Icon from 'frontend/components/UI/Icon'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

interface StoreCardProps {
  storeKey: string
  runner: Runner
  title: string
  description: string
  isLoggedIn: boolean
  user?: string
  loginUrl: string
  storeRoute: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logout: () => any
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

  const handleLogin = (event: MouseEvent) => {
    event.stopPropagation()
    navigate(loginUrl)
  }

  const handleAltLogin = (event: MouseEvent) => {
    event.stopPropagation()
    alternativeLoginAction?.()
  }

  const displayName = user
    ? String(user).slice(0, maxNameLength) +
      (String(user).length > maxNameLength ? '...' : '')
    : ''

  return (
    <Tooltip content={t('login.browse_store', 'Browse store')} asChild>
      <div
        className={classNames('storeCard', storeKey, { disabled })}
        role="link"
        tabIndex={0}
        onClick={openStore}
        onKeyDown={handleKeyDown}
      >
        <FeatureCard
          className="storeCard__card"
          icon={<StoreBadge runner={runner} className="storeCard__badge" />}
          title={title}
          description={description}
          meta={
            isLoggedIn && displayName ? (
              <span className="storeCard__user">
                <span className="storeCard__loggedLabel">
                  <Icon glyph={CircleCheck} size="sm" />
                  {t('login.logged_in_as', 'Logged in as')}
                </span>
                <span className="storeCard__userName">{displayName}</span>
              </span>
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
                  disabled={isLoggingOut}
                  onClick={handleLogout}
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
                    disabled={disabled}
                    onClick={handleLogin}
                  >
                    {t('login.button', 'Log in')}
                  </Button>
                  {alternativeLoginAction && (
                    <Button
                      variant="ghost"
                      size="md"
                      fullWidth
                      disabled={disabled}
                      onClick={handleAltLogin}
                    >
                      {t(
                        'login.alternative_method',
                        'Alternative login method'
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          }
        />
      </div>
    </Tooltip>
  )
}
