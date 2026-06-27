import { useContext, useEffect, useState } from 'react'
import LinkIcon from '@mui/icons-material/Link'
import PublicIcon from '@mui/icons-material/Public'
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
    error: false,
    fetchingUrl: false
  })
  const [linkCopied, setLinkCopied] = useState(false)

  // Get store-specific configuration
  const config: StoreConfig =
    store === 'epic' ? epicConfig : store === 'gog' ? gogConfig : amazonConfig

  const { loading, error, fetchingUrl } = status

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
          setStatus((prev) => ({ ...prev, fetchingUrl: false, error: true }))
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
    setStatus({ loading: true, error: false, fetchingUrl: false })

    try {
      // Extract and validate code
      const extractedCode = config.extractCode(inputCode)
      if (!extractedCode || extractedCode.length < config.minCodeLength) {
        setStatus({ loading: false, error: true, fetchingUrl: false })
        setTimeout(
          () => setStatus({ loading: false, error: false, fetchingUrl: false }),
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
            setStatus({ loading: false, error: true, fetchingUrl: false })
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
        setStatus({ loading: false, error: false, fetchingUrl: false })
        backdropClick()
      } else {
        setStatus({ loading: false, error: true, fetchingUrl: false })
        setTimeout(
          () => setStatus({ loading: false, error: false, fetchingUrl: false }),
          2500
        )
      }
    } catch (err) {
      console.error(`[AltLogin] Login error:`, err)
      setStatus({ loading: false, error: true, fetchingUrl: false })
      setTimeout(
        () => setStatus({ loading: false, error: false, fetchingUrl: false }),
        2500
      )
    }
  }

  function getButtonLabel() {
    if (loading) {
      return t('button.loading', 'Loading')
    } else if (error) {
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
              {t(
                `manual.${store}.step1`,
                `Open the ${store.toUpperCase()} login page in your browser and log in to your account.`
              )}
              {fetchingUrl ? (
                <p>
                  <Autorenew className="material-icons refreshing" />{' '}
                  {t('manual.amazon.loading_url', 'Preparing login...')}
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
            <li>
              {t(
                `manual.${store}.step2`,
                `After logging in, copy the entire URL from your browser's address bar and paste it in the input box below.`
              )}
            </li>
          </ol>
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
        <button
          onClick={async () => handleLogin(input)}
          className="button is-primary"
          disabled={
            loading ||
            input.length < config.minCodeLength ||
            error ||
            fetchingUrl
          }
        >
          {getButtonLabel()}
        </button>
      </div>
    </div>
  )
}
