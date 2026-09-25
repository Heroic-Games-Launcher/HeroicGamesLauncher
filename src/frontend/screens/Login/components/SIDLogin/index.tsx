import { useContext, useState } from 'react'
import { Globe, Info, Link as LinkIcon, RefreshCw } from 'lucide-react'
import { Paper, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { loginPage, sidInfoPage } from 'frontend/helpers'
import './index.css'
import ContextProvider from 'frontend/state/ContextProvider'
import { Button, Icon } from 'frontend/components/UI'

interface Props {
  backdropClick: () => void
}

export default function SIDLogin({ backdropClick }: Props) {
  const epicLoginUrl = 'https://legendary.gl/epiclogin'

  const { epic } = useContext(ContextProvider)
  const { t } = useTranslation('login')
  const [input, setInput] = useState('')
  const [status, setStatus] = useState({
    loading: false,
    error: false
  })
  const [linkCopied, setLinkCopied] = useState(false)

  const { loading, error } = status

  const handleCopyLink = () => {
    window.api.clipboardWriteText(epicLoginUrl)
    setLinkCopied(true)
  }

  const handleLogin = async (sid: string) => {
    window.api.logInfo('Called Epic Login')
    setStatus({
      loading: true,
      error: false
    })
    await epic.login(sid).then(async (res) => {
      console.log(res)
      if (res === 'done') {
        await window.api.getUserInfo()
        setStatus({ loading: false, error: false })
        backdropClick()
      } else {
        setStatus({
          loading: false,
          error: true
        })
        setTimeout(() => {
          setStatus({ loading: false, error: false })
        }, 2500)
      }
    })
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
    <div className="SIDLoginModal">
      <span className="backdrop" onClick={backdropClick}></span>
      <div className="sid-modal">
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
              {`${t('message.part2')} `}
              <span onClick={() => loginPage()} className="epicLink">
                {t('message.part3')}
              </span>
              {`${t('message.part4')} `}
              <span onClick={() => sidInfoPage()} className="sid">
                {`${t('message.part5')}`}
                <Info
                  style={{ marginLeft: '4px' }}
                  className="material-icons"
                />
              </span>
              <Paper variant="outlined" className="login-link">
                <Typography variant="subtitle1" paddingLeft={2}>
                  {epicLoginUrl}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyLink}
                    icon={<Icon glyph={LinkIcon} size="sm" />}
                  >
                    {linkCopied ? t('button.copied') : t('button.copy')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loginPage()}
                    icon={<Icon glyph={Globe} size="sm" />}
                  >
                    {t('button.open')}
                  </Button>
                </Stack>
              </Paper>
            </li>
            <li>
              {`${t('message.part6')} `}
              <span onClick={() => sidInfoPage()} className="sid">
                {`${t('message.part7')}`}
              </span>
              {` ${t('message.part8')}`}
            </li>
          </ol>
        </div>
        <input
          type="text"
          className="sid-input"
          value={input}
          onAuxClick={async () => {
            const text = await window.api.clipboardReadText()
            setInput(text)
          }} // clipboard.readText('clipboard'))}
          onChange={(e) => setInput(e.target.value)}
        />
        {loading && (
          <p className="message">
            <Icon glyph={RefreshCw} className="lucide-spin" />{' '}
          </p>
        )}
        <Button
          variant="primary"
          onClick={async () => handleLogin(input)}
          disabled={loading || input.length < 30 || error}
        >
          {getButtonLabel()}
        </Button>
      </div>
    </div>
  )
}
