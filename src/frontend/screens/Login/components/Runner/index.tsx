import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import './index.css'

interface RunnerProps {
  loginUrl: string
  class: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  isLoggedIn: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logoutAction: () => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alternativeLoginAction?: () => any
}

export default function Runner(props: RunnerProps) {
  const maxNameLength = 20
  const { t } = useTranslation()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  let buttonText = ''
  if (props.class === 'epic') {
    buttonText = t('login.epic', 'Epic Games Login')
  } else if (props.class === 'nile') {
    buttonText = t('login.amazon', 'Amazon Login')
  } else {
    buttonText = t('login.gog', 'GOG Login')
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    await props.logoutAction()
    // FIXME: only delete local storage relate to one store, or only delete if logged out from both
    //window.localStorage.clear()
    setIsLoggingOut(false)
  }
  return (
    <>
      <div className={`runnerWrapper ${props.class}`}>
        <div className={`runnerIcon ${props.class}`}>{props.icon()}</div>
        {props.isLoggedIn && (
          <div className="userData">
            <span>
              {String(props.user).slice(0, maxNameLength) +
                (String(props.user).length > maxNameLength ? '...' : '')}
            </span>
          </div>
        )}
        <div className="runnerButtons">
          {!props.isLoggedIn ? (
            <Link to={props.loginUrl} className="runnerLogin">
              {buttonText}
            </Link>
          ) : isLoggingOut ? (
            <div className="runnerLogin logged">
              {t('userselector.logging_out', 'Logging out')}...
            </div>
          ) : (
            <div
              className="runnerLogin logged"
              onClick={() => {
                handleLogout()
              }}
            >
              {t('userselector.logout', 'Logout')}
            </div>
          )}
        </div>
      </div>
      {props.alternativeLoginAction && !props.isLoggedIn && (
        <div className="runnerWrapper">
          <div className="runnerIcon alternative">{props.icon()}</div>
          <div className="runnerButtons">
            <div
              onClick={props.alternativeLoginAction}
              className="runnerLogin alternative"
            >
              {`${props.class} ${t(
                'login.alternative_method',
                'Alternative Login Method'
              )}`}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
