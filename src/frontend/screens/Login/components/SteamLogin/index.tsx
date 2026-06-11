import { useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { Autorenew } from '@mui/icons-material'
import ContextProvider from 'frontend/state/ContextProvider'
import '../SIDLogin/index.css'
import './index.css'

interface Props {
  backdropClick: () => void
  onSuccess?: () => void
}

type Mode = 'password' | 'qr'

/**
 * Credentials form for signing in to Steam through Aurelia (`aurelia login`).
 * Replaces the old Steam OpenID webview: Aurelia owns the Steam session, so we
 * collect the username/password (and an optional Steam Guard code) here and hand
 * them to the backend. A QR mode is also offered, mirroring the Steam Mobile
 * app's scan-to-approve flow (`aurelia login --qr`).
 */
export default function SteamLogin({ backdropClick, onSuccess }: Props) {
  const { steam } = useContext(ContextProvider)
  const { t } = useTranslation('login')
  const [mode, setMode] = useState<Mode>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [guard, setGuard] = useState('')
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<{
    loading: boolean
    error: string | false
  }>({ loading: false, error: false })

  const { loading, error } = status

  // Tracks whether the QR sign-in completed (success or hard failure) so the
  // cleanup below doesn't abort an already-finished `aurelia login --qr`.
  const qrDone = useRef(false)

  // QR flow: kick off `aurelia login --qr`, draw the challenge URL it streams
  // back, and resolve once the user approves the sign-in on their phone. The
  // process is aborted if the dialog is closed before that happens.
  useEffect(() => {
    if (mode !== 'qr') return

    qrDone.current = false
    setQrUrl(null)
    setStatus({ loading: true, error: false })

    const removeListener = window.api.handleSteamQrChallenge((_e, url) =>
      setQrUrl(url)
    )

    void steam.loginQr().then((result) => {
      qrDone.current = true
      if (result.status === 'done') {
        onSuccess?.()
        backdropClick()
      } else if (result.error !== 'cancelled') {
        setStatus({
          loading: false,
          error:
            result.error ||
            t('steam.qr.error', 'QR sign-in failed. Please try again.')
        })
      }
    })

    return () => {
      removeListener()
      if (!qrDone.current) {
        window.api.cancelSteamQrLogin()
      }
    }
    // Re-run only when switching into/out of QR mode; the closed-over callbacks
    // are stable for the lifetime of the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleLogin = async () => {
    setStatus({ loading: true, error: false })
    const result = await steam.login({
      username,
      password,
      guard: guard || undefined
    })
    if (result.status === 'done') {
      setStatus({ loading: false, error: false })
      onSuccess?.()
      backdropClick()
    } else {
      setStatus({
        loading: false,
        error:
          result.error ||
          t(
            'steam.error',
            'Login failed. Check your credentials and Steam Guard code.'
          )
      })
    }
  }

  function getButtonLabel() {
    if (loading) {
      return t('button.loading', 'Loading')
    } else {
      return t('button.login', 'Login')
    }
  }

  return (
    <div className="SIDLoginModal">
      <span className="backdrop" onClick={backdropClick}></span>
      <div className="sid-modal">
        <div className="loginInstructions">
          <strong>{t('steam.welcome', 'Sign in to Steam')}</strong>
          {mode === 'password' ? (
            <p>
              {t(
                'steam.message',
                'Enter your Steam credentials. If your account uses Steam Guard, enter the current code as well — it is required.'
              )}
            </p>
          ) : (
            <p>
              {t(
                'steam.qr.message',
                'Open the Steam Mobile app, tap the QR icon and scan this code to approve the sign-in.'
              )}
            </p>
          )}
        </div>

        {mode === 'password' ? (
          <>
            <input
              type="text"
              className="sid-input"
              placeholder={t('steam.username', 'Username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              className="sid-input"
              placeholder={t('steam.password', 'Password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="text"
              className="sid-input"
              placeholder={t('steam.guard', 'Steam Guard code')}
              value={guard}
              onChange={(e) => setGuard(e.target.value)}
            />
            {loading && (
              <p className="message">
                <Autorenew className="material-icons refreshing" />{' '}
              </p>
            )}
            {error && <p className="message steam-login-error">{error}</p>}
            <button
              onClick={handleLogin}
              className="button is-primary"
              disabled={loading || !username || !password}
            >
              {getButtonLabel()}
            </button>
          </>
        ) : (
          <div className="steam-qr">
            {qrUrl ? (
              <div className="steam-qr-code">
                <QRCodeSVG value={qrUrl} size={200} marginSize={2} />
              </div>
            ) : (
              <p className="message">
                <Autorenew className="material-icons refreshing" />{' '}
              </p>
            )}
            {error && <p className="message steam-login-error">{error}</p>}
          </div>
        )}

        <button
          className="button is-text steam-mode-toggle"
          onClick={() => {
            setStatus({ loading: false, error: false })
            setMode(mode === 'password' ? 'qr' : 'password')
          }}
        >
          {mode === 'password'
            ? t('steam.qr.switch', 'Sign in with a QR code instead')
            : t('steam.qr.switchBack', 'Sign in with username and password')}
        </button>
      </div>
    </div>
  )
}
