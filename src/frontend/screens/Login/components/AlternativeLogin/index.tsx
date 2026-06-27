import { useContext, useEffect, useState } from 'react'
import LinkIcon from '@mui/icons-material/Link'
import PublicIcon from '@mui/icons-material/Public'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { Button, Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import './index.css'
import { Autorenew } from '@mui/icons-material'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  epicConfig,
  gogConfig,
  amazonConfig,
  StoreConfig
} from '../AltLoginModal/storeConfigs'
import type { NileLoginData } from 'common/types/nile'

interface Props {
  store: 'epic' | 'gog' | 'amazon'
  backdropClick: () => void
}

export default function AlternativeLogin({ store, backdropClick }: Props) {
  const { epic, gog, amazon } = useContext(ContextProvider)
  const { t } = useTranslation('login')
  const [input, setInput] = useState('')
  const [loginUrl, setLoginUrl] = useState('')
  const [pkceData, setPkceData] = useState<NileLoginData | null>(null)
  const [status, setStatus] = useState({
    loading: false,
    errorMessage: null as string | null,
    fetchingUrl: false
  })
  const [linkCopied, setLinkCopied] = useState(false)

  const manualTranslations = {
    epic: {
      step1: t(
        'manual.epic.step1',
        'Open the Epic Store login page in your browser, log in to your account and copy your authorization code (Session ID).'
      ),
      step2: t(
        'manual.epic.step2',
        'Paste your authorization code in the input box below and click on the login button.'
      )
    },
    gog: {
      step1: t(
        'manual.gog.step1',
        'Open the GOG login page in your browser and log in to your account.'
      ),
      step2: t(
        'manual.gog.step2',
        "After logging in, copy the entire URL from your browser's address bar and paste it in the input box below."
      )
    },
    amazon: {
      step1: t(
        'manual.amazon.step1',
        'Open the Amazon Games login page in your browser and log in to your account.'
      ),
      step2: t(
        'manual.amazon.step2',
        "After logging in, copy the entire URL from your browser's address bar and paste it in the input box below."
      ),
      loadingUrl: t('manual.amazon.loading_url', 'Preparing Amazon login...')
    },
    error: {
      invalidCode: t(
        'manual.error.invalid_code',
        'Could not extract authorization code. Please paste the complete redirect URL.'
      ),
      codeTooShort: t(
        'manual.error.code_too_short',
        'Code is too short or invalid'
      ),
      loginFailed: t(
        'manual.error.login_failed',
        'Login failed. Please try again or use the standard login method.'
      ),
      networkError: t(
        'manual.error.network_error',
        'Network error. Please try again.'
      ),
      fetchUrl: t('manual.error.fetch_url', 'Failed to prepare login'),
      noPkce: t('manual.error.no_pkce', 'Login data missing. Please try again.')
    }
  }

  // Get store-specific configuration
  const config: StoreConfig =
    store === 'epic' ? epicConfig : store === 'gog' ? gogConfig : amazonConfig

  const { loading, errorMessage, fetchingUrl } = status

  // Fetch login URL (dynamic for Amazon PKCE, static for others)
  useEffect(() => {
    if (store === 'amazon') {
      setStatus((prev) => ({ ...prev, fetchingUrl: true }))
      amazon
        .getLoginData()
        .then((data) => {
          if (data) {
            setPkceData(data)
            setLoginUrl(data.url)
          }
          setStatus((prev) => ({ ...prev, fetchingUrl: false }))
        })
        .catch((err) => {
          console.error('[AltLogin] PKCE fetch error:', err)
          window.api.logError(`Amazon PKCE fetch failed: ${err}`)
          setStatus((prev) => ({
            ...prev,
            fetchingUrl: false,
            errorMessage: manualTranslations.error.fetchUrl
          }))
        })
    } else {
      setLoginUrl(config.loginUrl)
    }
  }, [store, amazon, config.loginUrl])

  const handleCopyLink = () => {
    window.api.clipboardWriteText(loginUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleLogin = async (inputCode: string) => {
    window.api.logInfo(`Called ${store} alternative login`)
    setStatus({ loading: true, errorMessage: null, fetchingUrl: false })

    try {
      // Extract and validate code
      const extractedCode = config.extractCode(inputCode)
      if (!extractedCode) {
        setStatus({
          loading: false,
          errorMessage: manualTranslations.error.invalidCode,
          fetchingUrl: false
        })
        setTimeout(
          () =>
            setStatus({
              loading: false,
              errorMessage: null,
              fetchingUrl: false
            }),
          2500
        )
        return
      }
      if (extractedCode.length < config.minCodeLength) {
        setStatus({
          loading: false,
          errorMessage: manualTranslations.error.codeTooShort,
          fetchingUrl: false
        })
        setTimeout(
          () =>
            setStatus({
              loading: false,
              errorMessage: null,
              fetchingUrl: false
            }),
          2500
        )
        return
      }

      // Call store-specific login
      let result: string
      switch (store) {
        case 'epic':
          result = await epic.login(extractedCode)
          if (result === 'done') {
            await window.api.getUserInfo()
          }
          break
        case 'gog':
          result = await gog.login(extractedCode)
          break
        case 'amazon':
          if (!pkceData) {
            setStatus({
              loading: false,
              errorMessage: manualTranslations.error.noPkce,
              fetchingUrl: false
            })
            setTimeout(
              () =>
                setStatus({
                  loading: false,
                  errorMessage: null,
                  fetchingUrl: false
                }),
              3500
            )
            return
          }
          result = await amazon.login({
            code: extractedCode,
            code_verifier: pkceData.code_verifier,
            serial: pkceData.serial,
            client_id: pkceData.client_id
          })
          break
      }

      if (result === 'done') {
        setStatus({ loading: false, errorMessage: null, fetchingUrl: false })
        backdropClick()
      } else {
        setStatus({
          loading: false,
          errorMessage: manualTranslations.error.loginFailed,
          fetchingUrl: false
        })
        setTimeout(
          () =>
            setStatus({
              loading: false,
              errorMessage: null,
              fetchingUrl: false
            }),
          2500
        )
      }
    } catch (err) {
      console.error(`[AltLogin] Login error:`, err)
      setStatus({
        loading: false,
        errorMessage: manualTranslations.error.networkError,
        fetchingUrl: false
      })
      setTimeout(
        () =>
          setStatus({ loading: false, errorMessage: null, fetchingUrl: false }),
        3500
      )
    }
  }

  function getButtonLabel() {
    if (loading) {
      return t('button.loading', 'Loading')
    } else if (errorMessage) {
      return t('button.error', 'Error, try a different Code')
    } else {
      return t('button.login', 'Login')
    }
  }

  return (
    <div className="AlternativeLoginModal">
      <span className="backdrop" onClick={backdropClick}></span>
      <div className="alt-login-modal">
        <div className="loginInstructions">
          <strong>{t('welcome', 'Welcome!')}</strong>
          <p>
            {t(
              'message.part1',
              'In order for you to be able to log in and install your games, we first need you to follow the steps below:'
            )}
          </p>
          <ol>
            <li>
              {manualTranslations[store].step1}
              {fetchingUrl ? (
                <p>
                  <Autorenew className="material-icons refreshing" />{' '}
                  {manualTranslations.amazon.loadingUrl}
                </p>
              ) : (
                <Paper variant="outlined" className="login-link">
                  <Typography variant="subtitle1" paddingLeft={2}>
                    {loginUrl}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      className={
                        linkCopied ? 'icon-button-success' : 'icon-button'
                      }
                      onClick={handleCopyLink}
                      endIcon={<LinkIcon fontSize="small" />}
                      variant="outlined"
                      size="small"
                      disabled={!loginUrl}
                    >
                      {linkCopied ? t('button.copied') : t('button.copy')}
                    </Button>
                    <Button
                      className="icon-button"
                      endIcon={<PublicIcon fontSize="small" />}
                      onClick={() => window.api.openExternalUrl(loginUrl)}
                      size="small"
                      variant="outlined"
                      disabled={!loginUrl}
                    >
                      {t('button.open')}
                    </Button>
                  </Stack>
                </Paper>
              )}
            </li>
            <li>{manualTranslations[store].step2}</li>
          </ol>
          {config.helpUrl && (
            <div className="help-link-section">
              <Button
                className="help-link-button"
                startIcon={<HelpOutlineIcon fontSize="small" />}
                onClick={() => window.api.openExternalUrl(config.helpUrl!)}
                size="small"
                variant="text"
              >
                {t('help.link', 'Need help with alternative login?')}
              </Button>
            </div>
          )}
        </div>
        <input
          type="text"
          className="code-input"
          value={input}
          onAuxClick={async () => {
            const text = await window.api.clipboardReadText()
            setInput(text)
          }}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || fetchingUrl}
        />
        {loading && (
          <p className="message">
            <Autorenew className="material-icons refreshing" />{' '}
          </p>
        )}
        {errorMessage && (
          <p className="message error-message" style={{ color: 'red' }}>
            {errorMessage}
          </p>
        )}
        <button
          onClick={async () => handleLogin(input)}
          className="button is-primary"
          disabled={
            loading ||
            input.length < config.minCodeLength ||
            !!errorMessage ||
            fetchingUrl
          }
        >
          {getButtonLabel()}
        </button>
      </div>
    </div>
  )
}
