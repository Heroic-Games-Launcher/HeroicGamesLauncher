import { useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, X } from 'lucide-react'
import ContextProvider from 'frontend/state/ContextProvider'
import { Alert, Button, Icon } from 'frontend/components/UI'
import '../SIDLogin/index.css'
import './index.css'

interface Props {
  backdropClick: () => void
  onSuccess?: () => void
}

/** State of the credentials column. */
type Phase = 'idle' | 'submitting' | 'guard' | 'device'

/**
 * Steam sign-in, gated behind a limitations notice
 */
export default function SteamLogin(props: Props) {
  const { t } = useTranslation('login')
  const [agreed, setAgreed] = useState(false)

  if (agreed) return <SteamLoginForm {...props} />

  // Only "I Agree" closes this
  return (
    <div className="SIDLoginModal">
      <span className="backdrop"></span>
      <div
        className="sid-modal steam-notice-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="steam-notice-title"
      >
        <div className="loginInstructions">
          <strong id="steam-notice-title">
            {t('steam.notice.title', 'Attention')}
          </strong>
          <p>
            {t(
              'steam.notice.text',
              "The Steam client must be installed to use this feature.\n\nSteam support is new, so some games may not start, including games made by Valve, like Half-Life 2.\n\nOnline games may need the Steam client running, and games with anti-cheat probably won't work.\n\nPlease report problems on Discord or GitHub."
            )}
          </p>
        </div>
        <Button variant="primary" autoFocus onClick={() => setAgreed(true)}>
          {t('steam.notice.agree', 'I Agree')}
        </Button>
      </div>
    </div>
  )
}

/**
 * Credentials form for signing in to Steam
 */
function SteamLoginForm({ backdropClick, onSuccess }: Props) {
  const { steam } = useContext(ContextProvider)
  const { t } = useTranslation('login')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [guardKind, setGuardKind] = useState<'email' | 'device'>('device')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | false>(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrScanned, setQrScanned] = useState(false)
  const [qrError, setQrError] = useState<string | false>(false)

  const mounted = useRef(true)
  const qrDone = useRef(false)
  const qrScannedRef = useRef(false)
  const loginActive = useRef(false)
  const qrListeners = useRef<Array<() => void>>([])

  const finish = () => {
    if (!mounted.current) return
    onSuccess?.()
    backdropClick()
  }

  // Typed QR outcomes from the backend.
  const qrErrorMessage = (code: string) => {
    switch (code) {
      case 'denied':
        return t(
          'steam.qr.denied',
          'The sign-in was declined in the Steam Mobile app.'
        )
      case 'expired':
        return t(
          'steam.qr.expired',
          'The QR code expired before it was approved. Please try again.'
        )
      case 'offline':
        return t(
          'steam.qr.offline',
          "Couldn't reach Steam. Check your internet connection."
        )
      default:
        return t('steam.qr.error', 'QR sign-in failed. Please try again.')
    }
  }

  // (Re) start the QR flow
  const startQr = () => {
    qrDone.current = false
    qrScannedRef.current = false
    setQrUrl(null)
    setQrScanned(false)
    setQrError(false)

    qrListeners.current.forEach((remove) => remove())
    qrListeners.current = [
      window.api.handleSteamQrChallenge((_e, url) => setQrUrl(url)),
      window.api.handleSteamQrScanned(() => {
        qrScannedRef.current = true
        setQrScanned(true)
      })
    ]

    void steam.loginQr().then((result) => {
      qrDone.current = true
      if (result.status === 'done') {
        finish()
      } else if (
        result.error &&
        result.error !== 'cancelled' &&
        mounted.current
      ) {
        setQrError(qrErrorMessage(result.error))
      }
    })
  }

  useEffect(() => {
    mounted.current = true
    startQr()

    const removeGuard = window.api.handleSteamGuardRequired((_e, type) => {
      if (type === 'device_confirmation') {
        setPhase('device')
      } else {
        setGuardKind(type === 'email' ? 'email' : 'device')
        setCode('')
        setPhase('guard')
      }
    })
    const removeStatus = window.api.handleSteamLoginStatus((_e, status) => {
      if (status.state === 'awaiting_confirmation') {
        setStatusMessage(status.message ?? null)
      }
    })

    return () => {
      mounted.current = false
      removeGuard()
      removeStatus()
      qrListeners.current.forEach((remove) => remove())
      qrListeners.current = []
      const inProgress = loginActive.current || qrScannedRef.current
      if (!inProgress && !qrDone.current) {
        window.api.cancelSteamQrLogin()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') backdropClick()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [backdropClick])

  const handleLogin = async () => {
    setError(false)
    setStatusMessage(null)
    setPhase('submitting')
    // Steam rejects two concurrent auth sessions
    window.api.cancelSteamQrLogin()
    loginActive.current = true
    const result = await steam.login({ username, password })
    loginActive.current = false
    if (!mounted.current) return
    if (result.status === 'done') {
      finish()
    } else {
      setPhase('idle')
      if (result.error !== 'cancelled') {
        setError(
          t(
            'steam.error',
            'Login failed. Check your credentials and Steam Guard code.'
          )
        )
      }
      startQr()
    }
  }

  // Send the typed Steam Guard code back to the waiting login process.
  const handleSubmitCode = () => {
    if (!code.trim()) return
    setError(false)
    window.api.submitSteamGuardCode(code.trim())
    setPhase('submitting')
  }

  const busy = phase === 'submitting' || phase === 'device'

  const primaryLabel = () => {
    if (phase === 'guard') {
      return t('steam.submitCode', 'Submit code')
    }
    if (busy) {
      return t('button.loading', 'Loading')
    }
    return t('button.login', 'Login')
  }

  const primaryDisabled =
    phase === 'guard' ? !code.trim() : busy || !username || !password
  const onPrimary = phase === 'guard' ? handleSubmitCode : handleLogin

  const guardLabel =
    guardKind === 'email'
      ? t('steam.guard.email', 'Enter the code sent to your email')
      : t('steam.guard.device', 'Enter your Steam Guard code')

  const spinner = <Icon glyph={RefreshCw} size="sm" className="lucide-spin" />

  return (
    <div className="SIDLoginModal" role="dialog" aria-modal="true">
      <span className="backdrop" onClick={backdropClick}></span>
      <div className="sid-modal steam-login-modal">
        <button
          className="sid-modal__close"
          onClick={backdropClick}
          aria-label={t('button.close', 'Close')}
          type="button"
        >
          <Icon glyph={X} size="sm" />
        </button>
        <div className="loginInstructions">
          <strong>{t('steam.welcome', 'Sign in to Steam')}</strong>
        </div>

        <div className="steam-login-columns">
          <div className="steam-login-column steam-credentials">
            <span className="steam-section-title">
              {t('steam.accountName', 'Sign in with account name')}
            </span>
            <label className="steam-field-label" htmlFor="steam-username">
              {t('steam.username', 'Username')}
            </label>
            <input
              id="steam-username"
              type="text"
              className="sid-input"
              placeholder={t('steam.username', 'Username')}
              value={username}
              autoFocus
              disabled={busy}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label className="steam-field-label" htmlFor="steam-password">
              {t('steam.password', 'Password')}
            </label>
            <input
              id="steam-password"
              type="password"
              className="sid-input"
              placeholder={t('steam.password', 'Password')}
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !primaryDisabled && phase === 'idle') {
                  void handleLogin()
                }
              }}
            />

            {phase === 'guard' && (
              <>
                <label className="steam-field-label" htmlFor="steam-guard">
                  {guardLabel}
                </label>
                <input
                  id="steam-guard"
                  type="text"
                  className="sid-input"
                  placeholder={t('steam.guard.placeholder', 'Steam Guard code')}
                  value={code}
                  autoFocus
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitCode()
                  }}
                />
              </>
            )}

            {phase === 'device' && (
              <Alert variant="info">
                {t(
                  'steam.guard.deviceConfirmation',
                  'Approve this sign-in in your Steam Mobile app.'
                )}
              </Alert>
            )}

            {phase === 'submitting' && (
              <p className="steam-status">
                {spinner}
                {statusMessage ?? t('steam.signingIn', 'Signing in…')}
              </p>
            )}

            {error && <Alert variant="error">{error}</Alert>}

            <Button
              variant="primary"
              fullWidth
              className="steam-signin-btn"
              onClick={onPrimary}
              disabled={primaryDisabled}
            >
              {primaryLabel()}
            </Button>
          </div>

          <div className="steam-login-divider" role="separator"></div>

          <div className="steam-login-column steam-qr-column">
            <span className="steam-section-title">
              {t('steam.qr.title', 'Or sign in with QR')}
            </span>
            {qrUrl && !qrScanned ? (
              <div className="steam-qr-code">
                <QRCodeSVG value={qrUrl} size={200} marginSize={2} />
              </div>
            ) : (
              <div className="steam-qr-placeholder">{spinner}</div>
            )}
            <p className="steam-qr-caption">
              {qrScanned
                ? t(
                    'steam.qr.scanned',
                    'Scanned, approve the sign-in in your Steam Mobile app.'
                  )
                : t(
                    'steam.qr.caption',
                    'Use the Steam Mobile App to sign in via QR'
                  )}
            </p>
            {qrError && <Alert variant="error">{qrError}</Alert>}
          </div>
        </div>
      </div>
    </div>
  )
}
