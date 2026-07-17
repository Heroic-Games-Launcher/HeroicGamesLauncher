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

/** State of the credentials column. */
type Phase = 'idle' | 'submitting' | 'guard' | 'device'

/**
 * Credentials form for signing in to Steam
 */
export default function SteamLogin({ backdropClick, onSuccess }: Props) {
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
        setQrError(t('steam.qr.error', 'QR sign-in failed. Please try again.'))
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

  return (
    <div className="SIDLoginModal">
      <span className="backdrop" onClick={backdropClick}></span>
      <div className="sid-modal steam-login-modal">
        <div className="loginInstructions">
          <strong>{t('steam.welcome', 'Sign in to Steam')}</strong>
        </div>

        <div className="steam-login-columns">
          <div className="steam-login-column steam-credentials">
            <span className="steam-section-title">
              {t('steam.accountName', 'Sign in with account name')}
            </span>
            <input
              type="text"
              className="sid-input"
              placeholder={t('steam.username', 'Username')}
              value={username}
              autoFocus
              disabled={busy}
              onChange={(e) => setUsername(e.target.value)}
            />
            <span className="steam-field-label">
              {t('steam.password', 'Password')}
            </span>
            <input
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
                <span className="steam-field-label">{guardLabel}</span>
                <input
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
              <p className="message steam-status">
                {t(
                  'steam.guard.deviceConfirmation',
                  'Approve this sign-in in your Steam Mobile app.'
                )}
              </p>
            )}

            {busy && (
              <p className="message steam-status">
                <Autorenew className="material-icons refreshing" />{' '}
                {phase === 'submitting' &&
                  (statusMessage ?? t('steam.signingIn', 'Signing in…'))}
              </p>
            )}

            {error && <p className="message steam-login-error">{error}</p>}

            <button
              onClick={onPrimary}
              className="button is-primary steam-signin-btn"
              disabled={primaryDisabled}
            >
              {primaryLabel()}
            </button>
          </div>

          <div className="steam-login-divider" role="separator"></div>

          <div className="steam-login-column steam-qr-column">
            <span className="steam-section-title">
              {t('steam.qr.title', 'Or sign in with QR')}
            </span>
            {qrScanned ? (
              <div className="steam-qr-placeholder">
                <Autorenew className="material-icons refreshing" />
              </div>
            ) : qrUrl ? (
              <div className="steam-qr-code">
                <QRCodeSVG value={qrUrl} size={200} marginSize={2} />
              </div>
            ) : (
              <div className="steam-qr-placeholder">
                <Autorenew className="material-icons refreshing" />
              </div>
            )}
            <p className="steam-qr-caption">
              {qrScanned
                ? t(
                    'steam.qr.scanned',
                    'Scanned — approve the sign-in in your Steam Mobile app.'
                  )
                : t(
                    'steam.qr.caption',
                    'Use the Steam Mobile App to sign in via QR'
                  )}
            </p>
            {qrError && <p className="message steam-login-error">{qrError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
